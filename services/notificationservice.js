const Notification = require('../models/notification');

exports.createNotification = async (data) => {
  return Notification.create(data);
};

exports.getUserNotifications = async (userId) => {
  return Notification.find({ userId });
};

exports.markAsRead = async (id) => {
  return Notification.findByIdAndUpdate(id, { read: true });
};
