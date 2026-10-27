const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batchController');
const { optionalAuth, requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

// Preview endpoint (fast in-memory parsing of first 5 rows & sample errors)
router.post('/preview', optionalAuth, upload.single('file'), batchController.previewCsv);

// Upload and launch background batch processing
router.post('/upload', optionalAuth, upload.single('file'), batchController.uploadCsv);

// List all batches
router.get('/', optionalAuth, batchController.getBatches);

// Progress polling & details
router.get('/:id', optionalAuth, batchController.getBatchById);

// Rename batch
router.patch('/:id', optionalAuth, batchController.renameBatch);

// Retry failed rows
router.post('/:id/retry', optionalAuth, batchController.retryBatch);

// Export endpoints (Styled Excel & Plain CSV)
router.get('/:id/export/excel', optionalAuth, batchController.exportBatch);
router.get('/:id/export/csv', optionalAuth, batchController.exportBatch);
router.get('/:id/export', optionalAuth, batchController.exportBatch);

// Paginated batch row results (with server-side search, sort, filter)
router.get('/:id/rows', optionalAuth, batchController.getBatchRows);

// Delete batch
router.delete('/:id', optionalAuth, batchController.deleteBatch);

module.exports = router;
