const fs = require("fs");
const bcrypt = require("bcrypt");

async function createUser() {

    const password = "demo123";

    const passwordHash =
        await bcrypt.hash(password, 10);

    const users = [
        {
            email: "demo@example.com",
            passwordHash: passwordHash
        }
    ];

    fs.writeFileSync(
        "users.json",
        JSON.stringify(users, null, 2)
    );

    console.log("Demo user created.");
}

createUser();