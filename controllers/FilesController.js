import Queue from 'bull';
import fs from 'fs';
import mime from 'mime-types';
import { ObjectId } from 'mongodb';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import authUtils from '../utils/auth';
import dbClient from '../utils/db';

class FilesController {
  static async postUpload(req, res) {
    // Authenticate user, reject if no auth
    const checkAuth = await authUtils.checkAuth(req);
    if (checkAuth.status !== 200) return res.status(401).send({ error: 'Unauthorized' });

    // If authed, user is the payload from checkAuth()
    const userId = checkAuth.payload.id;

    // Get data from POST params
    const { name, type, data } = req.body;
    const parentId = req.body.parentId || 0;
    const isPublic = req.body.isPublic || false;

    // Get master folder path from env or default value
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    // Check if folder exists and create it if it doesn't
    if (!fs.existsSync(folderPath)) {
      try {
        fs.mkdirSync(folderPath, { recursive: true });
      } catch (e) {
        console.error(e);
        return res.status(500).send({ error: 'Unable to locate folder' });
      }
    }

    if (!name) return res.status(400).send({ error: 'Missing name' });
    if (!type || !['folder', 'file', 'image'].includes(type)) return res.status(400).send({ error: 'Missing type' });
    if (!data && type !== 'folder') return res.status(400).send({ error: 'Missing data' });
    if (parentId) {
      // If the requested parent doesn't exist, return 400: Parent not found
      const parent = await dbClient.files.findOne({ _id: new ObjectId(parentId) });
      if (!parent) return res.status(400).send({ error: 'Parent not found' });

      // If the file with id === parentId is not a folder, return 400: Parent is not a folder
      if (parent.type !== 'folder') return res.status(400).send({ error: 'Parent is not a folder' });
    }

    // If type is a folder, just enter the metadata in the db
    if (type === 'folder') {
      const fileDBObj = {
        userId,
        name,
        type,
        parentId: parentId ? ObjectId(parentId) : 0,
      };

      dbClient.files.insertOne(fileDBObj);
      return res.status(201).send({
        id: fileDBObj._id,
        userId,
        name,
        type,
        isPublic,
        parentId: parentId ? ObjectId(parentId) : 0,
      });
    }

    // If type is a file, save it to disk and enter metadata in db
    const filename = uuidv4();
    const localPath = `${folderPath}/${filename}`;
    const decodedData = Buffer.from(data, 'base64');
    fs.writeFileSync(localPath, decodedData, { flag: 'w+' });

    const fileDBObj = {
      userId,
      name,
      type,
      isPublic,
      parentId: parentId ? ObjectId(parentId) : 0,
      localPath,
    };

    dbClient.files.insertOne(fileDBObj);

    // File is written, now create thumbnails if file is an image

    if (type === 'image') {
      const fileQueue = Queue('fileQueue');
      await fileQueue.add({ userId, fileId: fileDBObj._id });
    }

    // Return metadata to API

    return res.status(201).send({
      id: fileDBObj._id,
      userId,
      name,
      type,
      isPublic,
      parentId: parentId ? ObjectId(parentId) : 0,
    });
  }
}

module.exports = FilesController;