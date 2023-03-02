import { MongoClient } from 'mongodb';

class DBClient {
  constructor() {
    this.host = process.env.DB_HOST || 'localhost';
    this.port = process.env.DB_PORT || 27017;
    this.database = process.env.DB_DATABASE || 'files_manager';

    const url = `mongodb://${this.host}:${this.port}`;

    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.client.connect();
    this.db = this.client.db(this.database);
  }
}

function isAlive() {
  return this.client.isConnected();
}

async function nbUsers() {
  const countUsers = await this.db.collection('users').countDocuments();
  return countUsers;
}

async function nbFiles() {
  const countFiles = await this.db.collection('files').countDocuments();
  return countFiles;
}

const dbClient = DBClient();
module.exports = dbClient;
