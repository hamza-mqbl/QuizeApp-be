# 🧠 Machine Learning-Based Quiz System and Preparation Suggestion System – Backend

This is the **backend** of an AI-powered quiz platform where teachers can create and manage quizzes, and students can securely attempt them. The system includes smart cheating prevention (e.g., tab-switch detection, location checks), and provides students with AI-generated performance feedback after results are published.

---

## 📌 Key Features (Backend)

- AI-assisted quiz generation (via OpenAI API)
- User authentication and role-based access (JWT)
- Quiz CRUD operations (create, update, delete, publish)
- Secure student quiz attempts and result storage
- AI-generated feedback after submission
- Email notifications (SMTP Gmail integration)
- Cheating prevention integrations (browser tab tracking & location validation via frontend support)

---

## 🧰 Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (via Mongoose)
- **Authentication**: JWT
- **AI Integration**: OpenAI API
- **Mail Service**: Nodemailer with Gmail SMTP
- **Environment Config**: `dotenv`

---

## 📦 Installation

> Ensure MongoDB is accessible and Node.js is installed.

# Clone the repository

```bash
git clone https://github.com/hamza-mqbl/QuizeApp-be.git
```

```bash
cd QuizeApp-be
```

# Install dependencies

```bash
npm install --legacy-peer-deps
```

# Run development server

```bash
npm run dev
```

🌐 Environment Variables
Create a .env file in the root directory and include the following:

```bash
PORT=5000
MONGO_URL="your-mongodb-connection-string"
JWT_SECRET_KEY=your-jwt-secret
JWT_EXPIRES=5d
ACTIVATION_SECRET=your-account-activation-secret
SMPT_HOST=smtp.gmail.com
SMPT_PORT=465
SMPT_PASSWORD=your-gmail-app-password
SMPT_MAIL=your-gmail-address
OPENAI_API_KEY=your-openai-api-key
```

📊 Future Scope
Webhook-based AI feedback training using student performance

Advanced proctoring integrations (eye-tracking, voice monitoring)
🙋‍♂️ Developed By
Hamza Maqbool
Backend Developer – MERN Stack
🔗 LinkedIn
