const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const yup = require("yup");
const { customAlphabet } = require("nanoid/async");
const knex = require("knex");
require("dotenv").config()

// Set up slug generator
const alphabet = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const getSlug = customAlphabet(alphabet, 8) // Alphabet, length

const app = express();
const db = knex({
	client: "mysql",
	connection: {
		host: process.env.DB_HOST,
		port: process.env.DB_PORT || 3306,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_DATABASE,
		socketPath: process.env.DB_SOCKET_PATH
	}
});

const auth = (req, res, next) => {
	const key = req.headers.authorization;

	if (!key || key !== process.env.API_KEY) {
		return res.status(401).json({
			error: "Incorrect authentication details"
		});
	}

	next();
}

app.use(helmet());
app.use(morgan("short"));
app.use(cors());
app.use(express.json());


app.get("/", (req, res) => {
	res.json({
		msg: "ShareX URL shortener by Nomad"
	});
});

app.get("/:id", async (req, res, next) => {
	const { id: slug } = req.params

	try {
		const [result] = await db.select("url").from("short_urls").where({ slug });
		if (result) {
			const { url } = result;
			res.redirect(301, url);
		} else {
			res.json({
				msg: `URL with slug '${slug}' not found`
			})
		}
	} catch (error) {
		next(error);
	}
});

const schema = yup.object().shape({
	url: yup.string().url().required(),
});

app.post("/", auth, async (req, res, next) => {
	try {
		await schema.validate(req.body);
	} catch (error) {
		return next(error);
	}

	const { url } = req.body;
	const slug = await getSlug();

	try {
		await db.insert({ slug, url }).into("short_urls");
		res.json({
			slug,
			url
		});
	} catch (error) {
		next(error);
	}
});

app.use((error, req, res, next) => {
	res.status(400).json({
		error: error.message,
	});
});

const port = process.env.PORT || 4242;
app.listen(port, () => {
	// Set up our DB table
	db.schema.hasTable("short_urls").then(exists => {
		if (!exists) {
			db.schema.createTable("short_urls", table => {
				table.increments("id");

				table.string("slug").unique();
				table.string("url");

				table.timestamp("created_at").defaultTo(db.fn.now());
			})
				.then(() => console.log("Created short_urls table"))
				.catch(e => console.error("Error creating short_urls table", e));
		}
	})
		.catch(e => console.error("Error creating short_urls table", e));

	console.log(`Listening on http://localhost:${port}`);
});