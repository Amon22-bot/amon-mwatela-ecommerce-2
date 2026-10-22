const path = require('path');
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const sourceUri = process.env.MONGO_URI;
const destinationUri = process.env.DESTINATION_MONGO_URI;

if (!sourceUri) {
    console.error('Source MONGO_URI is missing from server/.env.');
    process.exit(1);
}

if (!destinationUri) {
    console.error('Set DESTINATION_MONGO_URI to the hosted MongoDB connection string first.');
    process.exit(1);
}

async function copyDemoProducts() {
    const sourceClient = new MongoClient(sourceUri);
    const destinationClient = new MongoClient(destinationUri);

    try {
        await Promise.all([sourceClient.connect(), destinationClient.connect()]);

        const sourceProducts = sourceClient.db().collection('products');
        const destinationProducts = destinationClient.db().collection('products');
        const demoProducts = await sourceProducts.find({ isDemo: true }).toArray();

        if (demoProducts.length === 0) {
            console.log('No demo products found. Nothing was changed.');
            return;
        }

        const operations = demoProducts.map(product => ({
            replaceOne: {
                filter: { _id: product._id },
                replacement: product,
                upsert: true
            }
        }));

        const result = await destinationProducts.bulkWrite(operations, { ordered: false });
        console.log(`Copied ${demoProducts.length} demo products to the hosted database.`);
        console.log(`Inserted: ${result.upsertedCount}; updated: ${result.modifiedCount}.`);
    } catch (error) {
        console.error('Demo product transfer failed:', error.message);
        process.exitCode = 1;
    } finally {
        await Promise.allSettled([sourceClient.close(), destinationClient.close()]);
    }
}

copyDemoProducts();
