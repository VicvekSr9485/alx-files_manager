import RedisClient from '../utils/redis';
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

    const existingUser = await dbClient.db.collection('users').find({ email }).toAray();
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Already exist' });
    }
    const hashedPassword = hashPassword(password);
    const newUser = await dbClient.db.collection('users').insertOne({ email, password: hashedPassword });
    return (res.status(201).json({ id: newUser.ops[0]._id, email: newUser.ops[0].email }));
  }
}

module.exports = UsersController;
