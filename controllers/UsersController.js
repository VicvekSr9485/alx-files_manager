import { ObjectId } from 'mongodb';
import redisClient from '../utils/redis';
import dbClient from '../utils/db';
import { hashPassword } from '../utils/passwordFunctions';

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Missing email' });
    }
    if (!password) {
      return res.status(400).json({ error: 'Missing password' });
    }

    const existingUser = await dbClient.db.collection('users').find({ email }).toArray();
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Already exist' });
    }
    const hashedPassword = hashPassword(password);
    const newUser = await dbClient.db.collection('users').insertOne({ email, password: hashedPassword });
    return (res.status(201).json({ id: newUser.ops[0]._id, email: newUser.ops[0].email }));
  }

  static async getMe(req, res) {
    const token = req.header('X-Token') || null;

    if (!token || token.length === 0) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const key = `auth_${token}`;
    const user = await redisClient.get(key);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const dbResult = await dbClient.db.collection('users').findOne({ _id: ObjectId(user) });
    if (!dbResult) return res.status(401).json({ error: 'Unauthorized' });

    return res.status(200).json({ id: user, email: dbResult.email });
  }
}

export default UsersController;
