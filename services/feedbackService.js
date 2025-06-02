const { OpenAI } = require("openai");
require("dotenv").config({ path: "../config/env" });

const generateFeedback = async (quiz, answers, score) => {
  // Analyze answers
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  const answerAnalysis = [];
  quiz.questions.forEach((question, index) => {
    const studentAnswer = answers[index]?.trim() || "";
    const isCorrect = studentAnswer === question.correctAnswer;
    answerAnalysis.push({
      question: question.questionText,
      studentAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect,
    });
  });

  // Prepare prompt for OpenAI
  const prompt = `
    Analyze the following quiz submission and provide detailed feedback:
    - Total questions: ${quiz.questions.length}
    - Score: ${score}
    - Questions with answers:
    ${answerAnalysis
      .map(
        (a, i) =>
          `${i + 1}. Question: ${a.question}\n   Student Answer: ${
            a.studentAnswer
          }\n   Correct Answer: ${a.correctAnswer}\n   Result: ${
            a.isCorrect ? "Correct" : "Incorrect"
          }`
      )
      .join("\n")}

    Provide feedback on the student's performance, identify weak areas, highlight strengths, and suggest improvements for achieving excellent results.
  `;

  // Call OpenAI API
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 500,
  });
  console.log("🚀 ~ generateFeedback ~ response:", response);

  return response.choices[0].message.content;
};

module.exports = { generateFeedback };
