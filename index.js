const express = require('express')
const { MongoClient } = require('mongodb');
const app = express();
const ObjectId = require('mongodb').ObjectId;
const admin = require("firebase-admin");
const cors = require('cors');
const port = process.env.PORT || 5000;
require('dotenv').config();
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUTNT);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});



// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.n30la.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {
        }
    }
    next();
}

async function run() {
    try {
        await client.connect();
        const database = client.db("BikerWala");
        const bikesCollection = database.collection("allBikes");
        const selectedCollection = database.collection('individiulSelectedService');
        const usersCollection = database.collection('users');
        const feedbackCollection = database.collection('feedbacks');

        app.get('/homeProducts', async (req, res) => {
            const cursor = bikesCollection.find({});
            const products = await cursor.limit(6).toArray();
            res.json(products);
        });
        app.get('/allproducts', async (req, res) => {
            const cursor = bikesCollection.find({});
            const products = await cursor.toArray();
            res.json(products);
        });
        // manage all orders get 
        app.get('/manageAllorders', async (req, res) => {
            const cursor = selectedCollection.find({});
            const services = await cursor.toArray();
            res.json(services);
        })
        app.get('/allfeedback', async (req, res) => {
            const cursor = feedbackCollection.find({});
            const feedback = await cursor.toArray();
            res.json(feedback);
        });
        app.get('/singledetails/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const service = await bikesCollection.findOne(query);
            res.json(service);
        });
        // GET SELETECTED ITEM API 
        app.get('/dashboard/myorders/:userEmail', async (req, res) => {
            const email = req.params.userEmail;
            const cursor = selectedCollection.find({});
            const services = await cursor.toArray();
            const selectService = services.filter(service => service.email == email);
            res.json(selectService);
        })
        // POST API
        app.post('/addNewConsumer', async (req, res) => {
            const order = req.body;
            order.createdAt = new Date().toLocaleDateString();
            const result = await selectedCollection.insertOne(order);
            res.json(result);
        });
        app.post('/addproduct', async (req, res) => {
            const product = req.body;
            const result = await bikesCollection.insertOne(product);
            res.json(result);
        });
        app.delete('/manageAllorders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await selectedCollection.deleteOne(query);
            res.json(result);
        });
        app.delete('/manageallservices/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await bikesCollection.deleteOne(query);
            res.json(result);
        });
        app.post('/addfeedback', async (req, res) => {
            const feedback = req.body;
            const result = await feedbackCollection.insertOne(feedback);
            res.json(result);
        });
        app.delete('/dashoard/myorders/:id', async (req, res) => {
            const id = req.params.id;
            console.log('deleting user with', id);
            const query = { _id: ObjectId(id) };
            const result = await selectedCollection.deleteOne(query);
            console.log(result);
            res.json(result);
        });
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.json(result)
        });
        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        });
        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = await usersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } };
                    const result = await usersCollection.updateOne(filter, updateDoc);
                    res.json(result);
                } else {
                    res.status(403).json({ message: 'You do not have Access to Make An Admin' })

                }
            }

        })
    }
    finally {
        // await client.close();
    }
}
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('Hello Bikers,We Are Here!')
})

app.listen(port, () => {
    console.log(`Example app listening at ${port}`)
})