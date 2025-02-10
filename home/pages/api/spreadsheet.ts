import { NextApiRequest, NextApiResponse } from 'next';
import GoogleSheetsAPI from '@/utils/service/googleSpreadsheetSDk';

const googleSheetsAPI = new GoogleSheetsAPI({
  clientEmail: process.env.GIAM_CLIENT_EMAIL as string,
  privateKey: process.env.GIAM_PRIVATE_KEY as string,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res);
    case 'PUT':
      return handlePut(req, res);
    case 'DELETE':
      return handleDelete(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const spreadsheetId = req.query.spreadsheetId as string;
  const range = (req.query.range as string) || 'A:Z';
  const targetId = req.query.targetId as string;

  try {
    if (!spreadsheetId || !targetId) {
      return res.status(400).json({ error: 'spreadsheetId and targetId are required.' });
    }

    const data = await googleSheetsAPI.getSheetData({
      spreadsheetId,
      range,
      targetId,
    });
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching sheet data: ', error);
    return res.status(500).json({ error: 'Failed to fetch sheet data.' });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  const spreadsheetId = req.query.spreadsheetId as string;
  const targetId = req.query.targetId as string;
  const { values, range } = req.body;

  try {
    if (!spreadsheetId || !targetId || !values) {
      return res.status(400).json({ error: 'spreadsheetId, targetId, and values are required.' });
    }

    const response = await googleSheetsAPI.appendSheetData({
      spreadsheetId,
      values,
      targetId,
      range: range || 'A:A',
    });
    return res.status(201).json({ message: 'Data appended successfully', response });
  } catch (error) {
    console.error('Error appending data: ', error);
    return res.status(500).json({ error: 'Failed to append data.' });
  }
}

async function handlePut(req: NextApiRequest, res: NextApiResponse) {
  const { spreadsheetId, range, values, targetId } = req.body;

  try {
    if (!spreadsheetId || !targetId || !values || !range) {
      return res.status(400).json({ error: 'spreadsheetId, targetId, values, and range are required.' });
    }

    const response = await googleSheetsAPI.updateSheetData({
      spreadsheetId,
      range,
      values,
      targetId,
    });
    return res.status(200).json({ message: 'Data updated successfully', response });
  } catch (error) {
    console.error('Error updating data: ', error);
    return res.status(500).json({ error: 'Failed to update data.' });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse) {
  const { spreadsheetId, targetId, majorDimension, indexes } = req.body;

  try {
    if (!spreadsheetId || !targetId || !majorDimension || !indexes) {
      return res.status(400).json({ error: 'spreadsheetId, targetId, majorDimension, and indexes are required.' });
    }

    const response = await googleSheetsAPI.deleteRowOrColumn({
      spreadsheetId,
      targetId,
      majorDimension,
      indexes,
    });
    return res.status(200).json({ message: 'Rows or columns deleted successfully', response });
  } catch (error) {
    console.error('Error deleting rows/columns: ', error);
    return res.status(500).json({ error: 'Failed to delete rows or columns.' });
  }
}