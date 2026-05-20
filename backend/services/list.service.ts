import listModel, { Role, Visibility } from '../models/listModel.js';

export const listService = {
  async createList(ownerId: string | number, title: string, description?: string, visibility?: Visibility) {
    return await listModel.create({
      owner_id: ownerId,
      title,
      description,
      visibility,
    });
  },

  async getLists(userId: string | number) {
    return await listModel.findAllForUser(userId);
  },

  async getList(listId: string | number, userId: string | number) {
    return await listModel.findOne(listId, userId);
  },

  async updateList(
    listId: string | number,
    userId: string | number,
    data: Partial<{ title: string; description: string; visibility: Visibility }>
  ) {
    return await listModel.update(listId, userId, data);
  },

  async deleteList(listId: string | number, userId: string | number) {
    return await listModel.delete(listId, userId);
  },

  async getListCards(listId: string | number, userId: string | number) {
    return await listModel.getCards(listId, userId);
  },

  async addCardToList(listId: string | number, cardId: string | number) {
    await listModel.addCard(listId, cardId);
  },

  async removeCardFromList(listId: string | number, cardId: string | number) {
    await listModel.removeCard(listId, cardId);
  },

  async copyCardFromList(cardId: string | number, userId: string | number) {
    return await listModel.copyCardToUser(cardId, userId);
  },

  async getPermissions(listId: string | number) {
    return await listModel.getPermissions(listId);
  },

  async inviteUser(listId: string | number, email: string, role: Role) {
    return await listModel.invite(listId, email, role);
  },

  async removePermission(listId: string | number, userId: string | number) {
    await listModel.removePermission(listId, userId);
  },

  async updatePermission(listId: string | number, userId: string | number, role: Role) {
    await listModel.updateRole(listId, userId, role);
  },
};
