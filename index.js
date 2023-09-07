const express = require('express')
const firebase = require('firebase/app')
require('firebase/firestore')

const firebaseConfig = {
	apiKey: process.env.FIREBASE_API_KEY,
	authDomain: process.env.FIREBASE_AUTH_DOMAIN,
	projectId: process.env.FIREBASE_PROJECT_ID,
	storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
	messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
	appId: process.env.FIREBASE_API_ID,
	measurementId: process.env.FIREBASE_MEASUREMENT_ID
}

const firebaseApp = firebase.initializeApp(firebaseConfig)
const app = express()

const PORT = 3000

// Middleware
const authenticateUser = (req, res, next) => {
	const idToken = req.header('Authorization')

	admin
		.auth()
		.verifyIdToken(idToken)
		.then(decodedToken => {
			req.user = decodedToken
			next()
		})
		.catch(error => {
			res.status(401).json({ message: 'Unauthorized' })
		})
}

const db = firebase.firestore()

app.post('/register', (req, res) => {
	const { username, email, password } = req.body

	if (!username || !email || !password) {
		return res.status(400).json({ error: 'Missing fields' })
	}

	firebase
		.auth()
		.createUserWithEmailAndPassword(email, password)
		.then(userCredential => {
			// Get user reference from Firebase Firestore
			const userRef = firebase
				.firestore()
				.collection('users')
				.doc(userCredential.user.uid)

			userRef
				.set({
					username,
					email,
					posts: []
				})
				.then(() => {
					res.status(201).json({ message: 'User registered successfully' })
				})
				.catch(error => {
					res.status(500).json({ error: error.message })
				})
		})
		.catch(error => {
			res.status(400).json({ error: error.message })
		})
})

app.post('/login', (req, res) => {
	const { email, password } = req.body

	if (!email || !password) {
		return res.status(400).json({ error: 'Missing fields' })
	}

	firebase
		.auth()
		.signInWithEmailAndPassword(email, password)
		.then(userCredential => {
			const userRef = firebase
				.firestore()
				.collection('users')
				.doc(userCredential.user.uid)

			userRef
				.get()
				.then(doc => {
					if (doc.exists) {
						res.status(200).json({
							message: 'User logged in successfully',
							data: doc.data()
						})
					} else {
						res.status(404).json({ error: 'User not found' })
					}
				})
				.catch(error => {
					res.status(500).json({ error: error.message })
				})
		})
		.catch(error => {
			res.status(400).json({ error: error.message })
		})
})

// Create a new post
app.post('/blogs', authenticateUser, (req, res) => {
	const { title, content } = req.body

	const newBlog = {
		title,
		content,
		authorId: req.user.uid,
		createdAt: new Date()
	}

	db.collection('blogs')
		.add(newBlog)
		.then(docRef => {
			res
				.status(201)
				.json({ message: 'Blog created successfully', blogId: docRef.id })
		})
		.catch(error => {
			res.status(500).json({ message: 'Blog creating post' })
		})
})

// Get all blogs
app.get('/blogs', (req, res) => {
	firebase.firestore.collection('blogs')
		.get()
		.then(snapshot => {
			const blogs = []
			snapshot.forEach(doc => {
				const data = doc.data()
				data.id = doc.id
				blogs.push(data)
			})
			res.status(200).json(blogs)
		})
		.catch(error => {
			res.status(500).json({ message: 'Error fetching blogs' })
		})
})

// Update a post
app.put('/blogs/:blogId', authenticateUser, (req, res) => {
	const { title, content } = req.body
	const blogId = req.params.blogId

	db.collection('blogs')
		.doc(blogId)
		.update({
			title,
			content
		})
		.then(() => {
			res.status(200).json({ message: 'Post updated successfully' })
		})
		.catch(error => {
			res.status(500).json({ message: 'Error updating post' })
		})
})

// Delete a post
app.delete('/blogs/:blogId', authenticateUser, (req, res) => {
	const blogId = req.params.blogId

	db.collection('blogs')
		.doc(blogId)
		.delete()
		.then(() => {
			res.status(200).json({ message: 'Post deleted successfully' })
		})
		.catch(error => {
			res.status(500).json({ message: 'Error deleting post' })
		})
})

app.listen(PORT, () => {
	console.log('server listening on port ',PORT)
})
