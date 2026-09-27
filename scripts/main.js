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
const questionCategory = document.querySelector("#question-category");
const questionText = document.querySelector("#question-text");
const answerOptions = document.querySelector("#answer-options");
const answerFeedback = document.querySelector("#answer-feedback");
const topicPills = document.querySelectorAll(".topic-pill");
const wireTopics = document.querySelectorAll(".wire-node[data-category]");
const wireLines = document.querySelectorAll(".wire-line[data-category]");
const sourceWires = document.querySelectorAll(".left-wires .wire-node[data-category]");

let questionBank = [];
let gameState = DataSpaceState.reset();
let currentQuestion;
let wrongAnswers = new Set();
let armedWireCategory = null;
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

	wireTopics.forEach((wire) => {
		const isSolved = gameState.completed.includes(wire.dataset.category);
		wire.classList.toggle("is-solved", isSolved);
		wire.classList.toggle("is-active", currentQuestion && currentQuestion.category.id === wire.dataset.category);
	});

	wireLines.forEach((line) => {
		const isSolved = gameState.completed.includes(line.dataset.category);
		line.classList.toggle("wire-connected", isSolved);
	});

	sourceWires.forEach((wire) => {
		const isActive = currentQuestion && currentQuestion.category.id === wire.dataset.category;
		wire.draggable = Boolean(isActive);
		wire.classList.toggle("is-available", Boolean(isActive));
	});
};

const showQuestion = () => {
	currentQuestion = questionBank[gameState.questionIndex];
	wrongAnswers = new Set();
	const language = getQuestionLanguage();
	questionNumber.textContent = `Q${String(gameState.questionIndex + 1).padStart(2, "0")}`;
	questionCategory.textContent = currentQuestion.category.name.en.toUpperCase();
	questionText.textContent = currentQuestion.question[language];
	answerFeedback.textContent = "";
	answerFeedback.className = "answer-feedback";
	answerOptions.classList.remove("is-locked");
	answerOptions.innerHTML = "";
	armedWireCategory = null;
	sourceWires.forEach((wire) => wire.classList.remove("is-armed"));
	updateTopicState();

	currentQuestion.options[language].forEach((option, index) => {
		const button = document.createElement("button");
		button.className = `answer-option option-${destinationColors[index]}`;
		button.type = "button";
		const answerText = document.createElement("span");
		answerText.className = "answer-text";
		answerText.textContent = `${String.fromCharCode(65 + index)}. ${option}`;
		button.append(answerText);
		button.addEventListener("click", () => {
			if (window.matchMedia("(pointer: coarse)").matches && armedWireCategory !== currentQuestion.category.id) {
				answerFeedback.textContent = "Tap the active wire first, then choose an answer.";
				answerFeedback.className = "answer-feedback feedback-hint";
				return;
			}
			chooseAnswer(index, button);
		});
		button.addEventListener("dragover", (event) => {
			event.preventDefault();
			button.classList.add("drop-target");
		});
		button.addEventListener("dragleave", () => button.classList.remove("drop-target"));
		button.addEventListener("drop", (event) => {
			event.preventDefault();
			button.classList.remove("drop-target");
			if (event.dataTransfer.getData("text/plain") === currentQuestion.category.id) chooseAnswer(index, button);
		});
		answerOptions.appendChild(button);
	});
	Object.entries(gameState.connections).forEach(([categoryId, answerIndex]) => {
		window.connectWire(categoryId, answerIndex);
	});
};

const chooseAnswer = (answerIndex, button) => {
	if (wrongAnswers.has(answerIndex) || answerOptions.classList.contains("is-locked")) return;
	if (answerIndex !== currentQuestion.correct) {
		wrongAnswers.add(answerIndex);
		button.classList.add("answer-wrong");
		button.disabled = true;
		gameState.score = Math.max(0, gameState.score - 1);
		DataSpaceState.save(gameState);
		answerFeedback.textContent = "Incorrect. Try another answer. -1 point";
		answerFeedback.className = "answer-feedback feedback-wrong";
		return;
	}

	answerOptions.classList.add("is-locked");
	armedWireCategory = null;
	button.classList.add("answer-correct");
	document.querySelectorAll(".answer-option").forEach((option) => { option.disabled = true; });
	if (!gameState.completed.includes(currentQuestion.category.id)) {
		gameState.completed.push(currentQuestion.category.id);
	}
	gameState.connections[currentQuestion.category.id] = answerIndex;
	DataSpaceState.save(gameState);
	window.connectWire(currentQuestion.category.id, answerIndex);
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
		questionCategory.textContent = "ERROR";
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

sourceWires.forEach((wire) => {
	wire.addEventListener("dragstart", (event) => {
		if (!currentQuestion || wire.dataset.category !== currentQuestion.category.id) {
			event.preventDefault();
			return;
		}
		event.dataTransfer.setData("text/plain", wire.dataset.category);
		wire.classList.add("is-dragging");
	});
	wire.addEventListener("dragend", () => wire.classList.remove("is-dragging"));
	wire.addEventListener("click", () => {
		if (!currentQuestion || wire.dataset.category !== currentQuestion.category.id) return;
		armedWireCategory = armedWireCategory === wire.dataset.category ? null : wire.dataset.category;
		sourceWires.forEach((source) => source.classList.toggle("is-armed", source.dataset.category === armedWireCategory));
		if (armedWireCategory) {
			answerFeedback.textContent = "Wire selected. Tap its matching answer.";
			answerFeedback.className = "answer-feedback feedback-hint";
		} else {
			answerFeedback.textContent = "";
			answerFeedback.className = "answer-feedback";
		}
	});
});