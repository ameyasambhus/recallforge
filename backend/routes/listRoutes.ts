import express from 'express';
import userAuth from '../middleware/userAuth.js';
import {
  createList,
  getLists,
  getList,
  updateList,
  deleteList,
  getListCards,
  addCardToList,
  removeCardFromList,
  getPermissions,
  inviteUser,
  removePermission,
  updatePermission,
  copyCardFromList,
} from '../controllers/list.controller.js';

const listRouter = express.Router();

// List CRUD
listRouter.get('/', userAuth, getLists);
listRouter.post('/', userAuth, createList);
listRouter.get('/:id', userAuth, getList);
listRouter.put('/:id', userAuth, updateList);
listRouter.delete('/:id', userAuth, deleteList);

// Cards within a list
listRouter.get('/:id/cards', userAuth, getListCards);
listRouter.post('/:id/cards', userAuth, addCardToList);
listRouter.delete('/:id/cards/:cardId', userAuth, removeCardFromList);
listRouter.post('/:id/cards/:cardId/copy', userAuth, copyCardFromList);

// Sharing / Permissions
listRouter.get('/:id/permissions', userAuth, getPermissions);
listRouter.post('/:id/permissions', userAuth, inviteUser);
listRouter.delete('/:id/permissions/:userId', userAuth, removePermission);
listRouter.put('/:id/permissions/:userId', userAuth, updatePermission);

export default listRouter;
