const languageScreen = document.querySelector("#language-screen");
const welcomeScreen = document.querySelector("#welcome-screen");
const rulesScreen = document.querySelector("#rules-screen");
const levelScreen = document.querySelector("#level-screen");
const gameScreen = document.querySelector("#game-screen");
const languageOptions = document.querySelectorAll(".language-option");
const nameForm = document.querySelector("#name-form");
const nameInput = document.querySelector("#player-name");
const crewName = document.querySelector("#crew-name");
const startGameButton = document.querySelector("#start-game-button");
const levelOptions = document.querySelectorAll(".level-option");
const difficultyReadout = document.querySelector("#difficulty-readout");
const questionNumber = document.querySelector("#question-number");
const questionText = document.querySelector("#question-text");
const answerOptions = document.querySelector("#answer-options");
const answerFeedback = document.querySelector("#answer-feedback");
const topicPills = document.querySelectorAll(".topic-pill");
const correctWireAudio = document.querySelector("#correct-wire-audio");

let questionBank = [];
let gameState = DataSpaceState.reset();
let currentQuestion;
let selectedLevel = "";
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
		const insulation = document.createElement("span");
		insulation.className = "wire-insulation";
		insulation.setAttribute("aria-hidden", "true");
		const wireIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		wireIcon.classList.add("wire-break-icon", `wire-color-${destinationColors[index]}`);
		wireIcon.dataset.answerIndex = index;
		wireIcon.setAttribute("viewBox", "0 0 60 60");
		wireIcon.setAttribute("aria-hidden", "true");
		const wireShape = document.createElementNS("http://www.w3.org/2000/svg", "use");
		wireShape.setAttribute("href", "#wire-break-shape");
		wireIcon.append(wireShape);
		button.append(insulation, wireIcon);
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

const playCorrectWireAudio = async () => {
	if (!correctWireAudio) return;
	correctWireAudio.currentTime = 0;
	let finishPlayback;
	const playbackFinished = new Promise((resolve) => {
		finishPlayback = () => {
			correctWireAudio.removeEventListener("ended", finishPlayback);
			correctWireAudio.removeEventListener("error", finishPlayback);
			resolve();
		};
		correctWireAudio.addEventListener("ended", finishPlayback, { once: true });
		correctWireAudio.addEventListener("error", finishPlayback, { once: true });
	});
	try {
		await correctWireAudio.play();
		await playbackFinished;
	} catch (error) {
		finishPlayback();
		console.warn("The correct-answer sound could not be played.", error);
	}
};

const chooseAnswer = async (answerIndex, button) => {
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
	const connectionAnimation = window.setQuestionWireState(answerIndex, "connected");
	updateTopicState();
	answerFeedback.textContent = "Correct! Moving to the next topic…";
	answerFeedback.className = "answer-feedback feedback-correct";
	await connectionAnimation;
	await playCorrectWireAudio();
	gameState.questionIndex += 1;
	DataSpaceState.save(gameState);
	if (gameState.questionIndex >= questionBank.length) {
		window.location.href = `celebration.html?score=${gameState.score}`;
		return;
	}
	showQuestion();
};

const loadQuestions = async () => {
	try {
		const response = await fetch(`data/${selectedLevel}/question.json`);
		if (!response.ok) throw new Error(`Question bank request failed: ${response.status}`);
		const data = await response.json();
		if (!Array.isArray(data.categories) || data.categories.length !== topicPills.length || data.categories.some((category, index) => category.id !== topicPills[index].dataset.category || !Array.isArray(category.questions) || category.questions.length === 0)) {
			throw new Error("Question bank has an unexpected topic structure.");
		}
		questionBank = data.categories.map((category) => ({
			category,
			...category.questions[Math.floor(Math.random() * category.questions.length)]
		}));
		const language = getQuestionLanguage();
		if (questionBank.some((question) => !question.question?.[language] || !Array.isArray(question.options?.[language]) || !Number.isInteger(question.correct) || question.correct < 0 || question.correct >= question.options[language].length)) {
			throw new Error("Question bank has missing translated content or an invalid answer.");
		}
		showQuestion();
	} catch (error) {
		console.error(error);
		questionNumber.textContent = "!";
		questionText.textContent = "This mission level could not be loaded. Please return and choose a level again.";
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
	levelScreen.classList.remove("is-hidden");
	levelScreen.focus({ preventScroll: true });
});

levelOptions.forEach((option) => {
	option.addEventListener("click", () => {
		selectedLevel = option.dataset.level;
		if (!["easy", "intermediate", "high"].includes(selectedLevel)) return;
		difficultyReadout.textContent = `LEVEL / ${selectedLevel.toUpperCase()}`;
		levelScreen.classList.add("is-hidden");
		gameScreen.classList.remove("is-hidden");
		questionText.focus({ preventScroll: true });
		loadQuestions();
	});
});

let resizeFrame = 0;
window.addEventListener("resize", () => {
	window.cancelAnimationFrame(resizeFrame);
	resizeFrame = window.requestAnimationFrame(window.drawQuestionWires);
});

if (document.fonts?.ready) {
	document.fonts.ready.then(() => window.drawQuestionWires());
}
