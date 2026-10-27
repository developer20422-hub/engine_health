const { Organisation, User } = require('../models');
const { sendResponse } = require('../utils/format');

/**
 * GET /api/organisations/me
 * Retrieves current user's organisation details with populated member info
 */
const getMyOrganisation = async (req, res, next) => {
  try {
    if (!req.user.organisationId) {
      return sendResponse(res, 200, null);
    }

    const organisation = await Organisation.findOne({
      _id: req.user.organisationId,
      deletedAt: null,
    })
      .populate('members.userId', 'name email role avatarUrl phone lastLoginAt')
      .populate('ownerId', 'name email avatarUrl phone')
      .populate('invitations.invitedBy', 'name email')
      .lean();

    if (!organisation) {
      return sendResponse(res, 404, null, {
        message: 'Organisation record not found',
        code: 'ORG_NOT_FOUND',
      });
    }

    return sendResponse(res, 200, organisation);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/organisations/me
 * Updates organisation profile details (Owner-Only)
 */
const updateMyOrganisation = async (req, res, next) => {
  try {
    if (!req.user.organisationId) {
      return sendResponse(res, 400, null, {
        message: 'You are not associated with any organisation.',
        code: 'NO_ORGANISATION',
      });
    }

    // Role check: Only owner can update organisation profile
    if (req.user.role !== 'owner') {
      return sendResponse(res, 403, null, {
        message: 'Forbidden: Only the organisation owner can update organisation details.',
        code: 'FORBIDDEN_OWNER_ONLY',
      });
    }

    const allowedFields = [
      'name',
      'type',
      'registrationNo',
      'address',
      'contactPerson',
      'phone',
      'mechanicsCount',
      'fleetSize',
      'logoUrl',
    ];

    const updates = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updates[key] = req.body[key];
      }
    }

    const updated = await Organisation.findOneAndUpdate(
      { _id: req.user.organisationId, deletedAt: null },
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('members.userId', 'name email role avatarUrl phone')
      .populate('ownerId', 'name email avatarUrl phone');

    return sendResponse(res, 200, updated);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/organisations/invite
 * Invite a staff member by email (Owner-Only)
 */
const inviteStaff = async (req, res, next) => {
  try {
    if (!req.user.organisationId) {
      return sendResponse(res, 400, null, {
        message: 'You are not associated with any organisation.',
        code: 'NO_ORGANISATION',
      });
    }

    if (req.user.role !== 'owner') {
      return sendResponse(res, 403, null, {
        message: 'Forbidden: Only the organisation owner can invite staff members.',
        code: 'FORBIDDEN_OWNER_ONLY',
      });
    }

    const { email, role = 'mechanic' } = req.body;
    const targetEmail = email.toLowerCase().trim();

    const org = await Organisation.findOne({
      _id: req.user.organisationId,
      deletedAt: null,
    });

    if (!org) {
      return sendResponse(res, 404, null, {
        message: 'Organisation not found',
        code: 'ORG_NOT_FOUND',
      });
    }

    // Check if target is already a member
    const existingUser = await User.findOne({ email: targetEmail, deletedAt: null });

    if (existingUser) {
      const isAlreadyMember = org.members.some(
        (m) => m.userId.toString() === existingUser._id.toString()
      );
      if (isAlreadyMember) {
        return sendResponse(res, 400, null, {
          message: 'User is already a member of this organisation.',
          code: 'ALREADY_MEMBER',
        });
      }

      // Add to organisation members
      org.members.push({
        userId: existingUser._id,
        role,
        addedAt: new Date(),
      });
      await org.save();

      // Update user's organisation & role
      existingUser.organisationId = org._id;
      existingUser.accountType = 'organisation';
      existingUser.role = role;
      await existingUser.save();

      const refreshed = await Organisation.findById(org._id)
        .populate('members.userId', 'name email role avatarUrl phone')
        .populate('ownerId', 'name email avatarUrl phone');

      return sendResponse(res, 200, {
        message: `${existingUser.name} (${targetEmail}) has been added as ${role}.`,
        organisation: refreshed,
      });
    }

    // User does not exist yet: create pending invitation
    const existingInvite = org.invitations.find((inv) => inv.email === targetEmail);
    if (existingInvite) {
      existingInvite.role = role;
      existingInvite.invitedAt = new Date();
    } else {
      org.invitations.push({
        email: targetEmail,
        role,
        invitedBy: req.user._id,
        invitedAt: new Date(),
      });
    }

    await org.save();

    const refreshed = await Organisation.findById(org._id)
      .populate('members.userId', 'name email role avatarUrl phone')
      .populate('ownerId', 'name email avatarUrl phone');

    return sendResponse(res, 200, {
      message: `Invitation queued for ${targetEmail} with role '${role}'.`,
      organisation: refreshed,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/organisations/members/:memberId
 * Remove a staff member from organisation (Owner-Only)
 */
const removeMember = async (req, res, next) => {
  try {
    if (req.user.role !== 'owner') {
      return sendResponse(res, 403, null, {
        message: 'Forbidden: Only the organisation owner can remove team members.',
        code: 'FORBIDDEN_OWNER_ONLY',
      });
    }

    const { memberId } = req.params;
    const org = await Organisation.findOne({
      _id: req.user.organisationId,
      deletedAt: null,
    });

    if (!org) {
      return sendResponse(res, 404, null, {
        message: 'Organisation not found',
        code: 'ORG_NOT_FOUND',
      });
    }

    // Prevent removing the owner
    if (org.ownerId.toString() === memberId) {
      return sendResponse(res, 400, null, {
        message: 'The organisation owner cannot be removed.',
        code: 'CANNOT_REMOVE_OWNER',
      });
    }

    org.members = org.members.filter((m) => m.userId.toString() !== memberId);
    await org.save();

    // Detach user from organisation
    await User.findByIdAndUpdate(memberId, {
      $set: { organisationId: null, role: 'user', accountType: 'individual' },
    });

    const refreshed = await Organisation.findById(org._id)
      .populate('members.userId', 'name email role avatarUrl phone')
      .populate('ownerId', 'name email avatarUrl phone');

    return sendResponse(res, 200, {
      message: 'Team member removed successfully.',
      organisation: refreshed,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/organisations/invitations/:inviteId
 * Cancel an invitation (Owner-Only)
 */
const cancelInvitation = async (req, res, next) => {
  try {
    if (req.user.role !== 'owner') {
      return sendResponse(res, 403, null, {
        message: 'Forbidden: Only the organisation owner can cancel invitations.',
        code: 'FORBIDDEN_OWNER_ONLY',
      });
    }

    const { inviteId } = req.params;
    const org = await Organisation.findOne({
      _id: req.user.organisationId,
      deletedAt: null,
    });

    if (!org) {
      return sendResponse(res, 404, null, {
        message: 'Organisation not found',
        code: 'ORG_NOT_FOUND',
      });
    }

    org.invitations = org.invitations.filter((inv) => inv._id.toString() !== inviteId);
    await org.save();

    const refreshed = await Organisation.findById(org._id)
      .populate('members.userId', 'name email role avatarUrl phone')
      .populate('ownerId', 'name email avatarUrl phone');

    return sendResponse(res, 200, {
      message: 'Invitation cancelled.',
      organisation: refreshed,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyOrganisation,
  updateMyOrganisation,
  inviteStaff,
  removeMember,
  cancelInvitation,
};
