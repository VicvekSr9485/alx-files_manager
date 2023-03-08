import fs from 'fs';
import mime from 'mime-types';
import { ObjectId } from 'mongodb';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import FileControllerHelper from '../utils/files';

class FilesController {
  static async postUpload(req, res) {
    const user = await FileControllerHelper.getUserWithToken(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const acceptedTypes = ['folder', 'file', 'image'];
    const {
      name,
      type,
      parentId,
      isPublic,
      data,
    } = req.body;

    if (!name) return res.status(400).json({ error: 'Missing name' });
    if ((!type || !acceptedTypes.includes(type))) return res.status(400).json({ error: 'Missing type' });
    if (!data && type !== 'folder') return res.status(400).json({ error: 'Missing data' });

    if (parentId) {
      const filesCollection = dbClient.db.collection('files');
      const parent = await filesCollection.findOne({ _id: ObjectId(parentId) });
      if (!parent) return res.status(400).json({ error: 'Parent not found' });
      if (parent.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
    }

    const fileData = {
      name,
      type,
      parentId: parentId || 0,
      isPublic: isPublic || false,
      userId: user._id.toString(),
    };

    if (type === 'folder') {
      const filesCollection = dbClient.db.collection('files');
      const result = await filesCollection.insertOne(fileData);
      fileData.id = result.insertedId;
      delete fileData._id;
      res.setHeader('Content-Type', 'application/json');
      return res.status(201).json(fileData);
    }
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    const fileName = uuidv4();
    const filePath = path.join(folderPath, fileName);

    fileData.localPath = filePath;
    const decodedData = Buffer.from(data, 'base64');
    const pathExists = await FileControllerHelper.pathExists(folderPath);
    if (!pathExists) {
      await fs.promises.mkdir(folderPath, { recursive: true });
    }
    return FileControllerHelper.writeToFile(res, filePath, decodedData, fileData);
  }
}

export default FilesController;
