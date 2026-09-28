const languageScreen = document.querySelector("#language-screen");
const welcomeScreen = document.querySelector("#welcome-screen");
const rulesScreen = document.querySelector("#rules-screen");
const gameScreen = document.querySelector("#game-screen");
const languageOptions = document.querySelectorAll(".language-option");
const nameForm = document.querySelector("#name-form");
const nameInput = document.querySelector("#player-name");
const crewName = document.querySelector("#crew-name");
const startGameButton = document.querySelector("#start-game-button");
const questionNumber = document.querySelector("#question-number");
const questionText = document.querySelector("#question-text");
const answerOptions = document.querySelector("#answer-options");
const answerFeedback = document.querySelector("#answer-feedback");
const topicPills = document.querySelectorAll(".topic-pill");

let questionBank = [];
let gameState = DataSpaceState.reset();
let currentQuestion;
let wrongAnswers = new Set();
const destinationColors = ["blue", "pink", "yellow", "orange", "cyan"];

const getQuestionLanguage = () => localStorage.getItem("dataSpaceQuestionLanguage") || "en";

const updateTopicState = () => {
	topicPills.forEach((pill) => {
		const isSolved = gameState.completed.includes(pill.dataset.category);
		const isCurrent = currentQuestion && currentQuestion.category.id === pill.dataset.category;
		pill.classList.toggle("is-solved", isSolved);
		pill.classList.toggle("is-visible", isSolved || isCurrent);
		pill.classList.toggle("is-active", isCurrent);
	});
};

const showQuestion = () => {
	currentQuestion = questionBank[gameState.questionIndex];
	wrongAnswers = new Set();
	const language = getQuestionLanguage();
	questionNumber.textContent = `Q${String(gameState.questionIndex + 1).padStart(2, "0")}`;
	questionText.textContent = currentQuestion.question[language];
	answerFeedback.textContent = "";
	answerFeedback.className = "answer-feedback";
	answerOptions.classList.remove("is-locked");
	answerOptions.innerHTML = "";
	updateTopicState();

	currentQuestion.options[language].forEach((option, index) => {
		const button = document.createElement("button");
		button.className = `answer-option option-${destinationColors[index]}`;
		button.type = "button";
		const answerText = document.createElement("span");
		answerText.className = "answer-text";
		answerText.textContent = `${String.fromCharCode(65 + index)}. ${option}`;
		button.append(answerText);
		button.addEventListener("click", () => chooseAnswer(index, button));
		button.addEventListener("dragover", (event) => {
			event.preventDefault();
			button.classList.add("drop-target");
		});
		button.addEventListener("dragleave", () => button.classList.remove("drop-target"));
		button.addEventListener("drop", (event) => {
			event.preventDefault();
			button.classList.remove("drop-target");
			if (event.dataTransfer.getData("text/plain") === String(index)) chooseAnswer(index, button);
		});
		answerOptions.appendChild(button);
	});
	window.drawQuestionWires(true);
};

const chooseAnswer = (answerIndex, button) => {
	if (wrongAnswers.has(answerIndex) || answerOptions.classList.contains("is-locked")) return;
	if (answerIndex !== currentQuestion.correct) {
		wrongAnswers.add(answerIndex);
		button.classList.add("answer-wrong");
		button.disabled = true;
		gameState.score = Math.max(0, gameState.score - 1);
		DataSpaceState.save(gameState);
		answerFeedback.textContent = "Incorrect. Wire disconnected. -1 point";
		answerFeedback.className = "answer-feedback feedback-wrong";
		window.setQuestionWireState(answerIndex, "wrong");
		return;
	}

	answerOptions.classList.add("is-locked");
	button.classList.add("answer-correct");
	document.querySelectorAll(".answer-option").forEach((option) => { option.disabled = true; });
	if (!gameState.completed.includes(currentQuestion.category.id)) {
		gameState.completed.push(currentQuestion.category.id);
	}
	DataSpaceState.save(gameState);
	window.setQuestionWireState(answerIndex, "connected");
	updateTopicState();
	answerFeedback.textContent = "Correct! Moving to the next topic…";
	answerFeedback.className = "answer-feedback feedback-correct";
	window.setTimeout(() => {
		gameState.questionIndex += 1;
		DataSpaceState.save(gameState);
		if (gameState.questionIndex >= questionBank.length) {
			window.location.href = `celebration.html?score=${gameState.score}`;
			return;
		}
		showQuestion();
	}, 750);
};

const loadQuestions = async () => {
	try {
		const response = await fetch("data/question.json");
		const data = await response.json();
		questionBank = data.categories.map((category) => ({
			category,
			...category.questions[Math.floor(Math.random() * category.questions.length)]
		}));
		showQuestion();
	} catch (error) {
		questionNumber.textContent = "!";
		questionText.textContent = "Questions could not be loaded. Please open the game through a local server.";
	}
};

languageOptions.forEach((option) => {
	option.addEventListener("click", () => {
		const selectedLanguage = option.dataset.language;
		localStorage.setItem("dataSpaceQuestionLanguage", selectedLanguage);
		languageOptions.forEach((item) => item.classList.remove("is-selected"));
		option.classList.add("is-selected");
		languageScreen.classList.add("is-hidden");
		welcomeScreen.classList.remove("is-hidden");
		nameInput.focus();
	});
});

nameForm.addEventListener("submit", (event) => {
	event.preventDefault();
	const name = nameInput.value.trim();
	if (!name) return;
	crewName.textContent = name;
	welcomeScreen.classList.add("is-hidden");
	rulesScreen.classList.remove("is-hidden");
	startGameButton.focus();
});

startGameButton.addEventListener("click", () => {
	rulesScreen.classList.add("is-hidden");
	gameScreen.classList.remove("is-hidden");
	loadQuestions();
});

let resizeFrame = 0;
window.addEventListener("resize", () => {
	window.cancelAnimationFrame(resizeFrame);
	resizeFrame = window.requestAnimationFrame(window.drawQuestionWires);
});

if (document.fonts?.ready) {
	document.fonts.ready.then(() => window.drawQuestionWires());
}