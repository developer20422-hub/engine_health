const express = require('express');
const router = express.Router();
const organisationController = require('../controllers/organisationController');
const { requireAuth } = require('../middleware/auth');
const { validateBody, validateParams } = require('../middleware/validate');
const {
  updateOrganisationSchema,
  inviteStaffSchema,
  idParamSchema,
} = require('../utils/validators');

// All organisation endpoints require authentication
router.use(requireAuth);

router.get('/me', organisationController.getMyOrganisation);
router.patch('/me', validateBody(updateOrganisationSchema), organisationController.updateMyOrganisation);
router.post('/invite', validateBody(inviteStaffSchema), organisationController.inviteStaff);
router.delete('/members/:memberId', organisationController.removeMember);
router.delete('/invitations/:inviteId', organisationController.cancelInvitation);

module.exports = router;
