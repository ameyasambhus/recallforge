import folderModel from '../models/folderModel.js';
import { invalidateUserCardsCache } from './card.service.js';

export const folderService = {
  async getFolders(userId: string | number) {
    return await folderModel.findByUser(userId);
  },

  async updateFolder(userId: string | number, folderId: string | number, name: string) {
    const updated = await folderModel.update({ id: folderId, user_id: userId }, name);
    await invalidateUserCardsCache(userId);
    return updated;
  },

  async deleteFolder(userId: string | number, folderId: string | number) {
    await folderModel.deleteById({ id: folderId, user_id: userId });
    await invalidateUserCardsCache(userId);
  },
};
