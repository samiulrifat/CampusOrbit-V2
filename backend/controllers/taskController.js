const Task = require('../models/Task');
const Club = require('../models/Club');
const User = require('../models/User');

// Club admin: assign a task to a member
exports.assignTask = async (req, res) => {
  try {
    const { clubId } = req.params;
    const { memberId, description } = req.body;
    const adminId = req.user.id;
    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: 'Club not found' });
    if (!club.officers.includes(adminId)) return res.status(403).json({ message: 'Not authorized' });
    if (!club.members.includes(memberId)) return res.status(400).json({ message: 'User not a member' });
  const task = new Task({ club: clubId, assignedTo: memberId, assignedBy: adminId, description });
  await task.save();
  const populatedTask = await Task.findById(task._id).populate('assignedTo', 'name email').populate('assignedBy', 'name email');
  res.status(201).json({ success: true, task: populatedTask });
  } catch (err) {
    res.status(500).json({ message: 'Failed to assign task', error: err.message });
  }
};

// Club admin: view all tasks for club
exports.getClubTasks = async (req, res) => {
  try {
    const { clubId } = req.params;
    const adminId = req.user.id;
    const club = await Club.findById(clubId);
    if (!club) return res.status(404).json({ message: 'Club not found' });
    if (!club.officers.includes(adminId)) return res.status(403).json({ message: 'Not authorized' });
    const tasks = await Task.find({ club: clubId }).populate('assignedTo', 'name email').populate('assignedBy', 'name email');
    res.json({ success: true, tasks });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch tasks', error: err.message });
  }
};

// Club admin: mark task complete
exports.markTaskComplete = async (req, res) => {
  try {
    const { taskId } = req.params;
    const adminId = req.user.id;
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const club = await Club.findById(task.club);
    if (!club || !club.officers.includes(adminId)) return res.status(403).json({ message: 'Not authorized' });
    task.status = 'completed';
    task.updatedAt = new Date();
  await task.save();
  const populatedTask = await Task.findById(task._id).populate('assignedTo', 'name email').populate('assignedBy', 'name email');
  res.json({ success: true, task: populatedTask });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark complete', error: err.message });
  }
};

// Member: view assigned tasks
exports.getMyTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const tasks = await Task.find({ assignedTo: userId }).populate('club', 'name');
    res.json({ success: true, tasks });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch tasks', error: err.message });
  }
};

// Member: update progress
exports.updateProgress = async (req, res) => {
  try {
    const userId = req.user.id;
    const { taskId } = req.params;
    const { progress } = req.body;
    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.assignedTo.toString() !== userId) return res.status(403).json({ message: 'Not authorized' });
    task.progress = progress;
    task.status = 'in-progress';
    task.updatedAt = new Date();
    await task.save();
    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update progress', error: err.message });
  }
};
