const upload = require('../config/storage');

module.exports = upload.single('file');
