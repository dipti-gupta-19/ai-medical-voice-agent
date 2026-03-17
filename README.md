# 🩺 MediVoice AI — Medical Voice Agent

**MediVoice AI** is an AI-powered healthcare assistant that enables users to interact with specialized virtual doctors through **real-time voice conversations**.
The system analyzes user symptoms and generates a structured medical report containing key information such as symptoms, diagnosis summary, recommendations, and precautions.

This project demonstrates how **voice AI, conversational interfaces, and modern web technologies** can simulate a virtual healthcare consultation experience.

---

# ✨ Key Features

* 🎙️ **Voice-based AI consultation** with medical specialists
* 👩‍⚕️ Multiple **AI doctor agents** (Dermatologist, etc.)
* 🧠 AI-generated **structured medical reports**
* 📜 **Consultation history tracking**
* 🔐 Secure authentication using **Clerk**
* 💎 **Premium doctor agents** for subscribed users
* ⚡ Fast UI powered by **Next.js + React**

---

# 🧠 How It Works

1. User logs into the platform.
2. User selects a medical AI specialist.
3. The consultation begins through a **voice conversation**.
4. AI analyzes the symptoms described by the user.
5. A **structured medical report** is generated automatically.

Example report sections:

* Symptoms
* Summary of condition
* Suggested medicines
* Recommendations
* Precautions

---

# 🛠️ Tech Stack

### Frontend

* **Next.js**
* **React**
* **Tailwind CSS**
* **Shadcn UI**

### Authentication

* **Clerk**

### AI & Voice

* **Vapi AI**
* **OpenAI voice models**

### Backend

* **Next.js API routes**

### Database

* **PostgreSQL**
* **Drizzle ORM**

---

# 📂 Project Structure

```
ai-medical-voice-agent
│
├── app
│   ├── dashboard
│   │   ├── history
│   │   ├── medical-agent
│   │   └── components
│
├── api
│   ├── medical-report
│   ├── session-chat
│   └── suggest-doctor
│
├── components
├── public
└── config
```

---

# ⚙️ Installation

Clone the repository:

```bash
git clone https://github.com/dipti-gupta-19/ai-medical-voice-agent.git
```

Navigate to the project folder:

```bash
cd ai-medical-voice-agent
```

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open the application in your browser:

```
http://localhost:3000
```

---

# 🔑 Environment Variables

Create a `.env.local` file and add the following:

```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

NEXT_PUBLIC_VAPI_PUBLIC_KEY=
NEXT_PUBLIC_VAPI_ASSISTANT_ID=

DATABASE_URL=
```

---

# 📸 Application Screens

### 🏠 Dashboard

Displays available AI doctor specialists.

### 🎙️ Voice Consultation

Users interact with AI doctors using voice.

### 📋 Medical Report

AI generates a structured consultation summary.

---

# ⚠️ Disclaimer

This project is built for **educational and demonstration purposes only**.
The AI-generated responses should **not be considered professional medical advice**.
Always consult a licensed healthcare professional for real medical concerns.

---

# 👩‍💻 Author

**Dipti Gupta**

GitHub:
[https://github.com/dipti-gupta-19](https://github.com/dipti-gupta-19)

---

# 🚀 Future Improvements

* AI-powered diagnosis suggestions
* Multi-language voice consultation
* Video consultation integration
* Advanced patient analytics dashboard
* Medicine recommendation system

---

⭐ If you found this project interesting, feel free to **star the repository**!

---
