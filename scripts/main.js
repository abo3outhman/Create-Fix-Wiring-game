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
const topicStrip = document.querySelector("#topic-strip");
const correctWireAudio = document.querySelector("#correct-wire-audio");

const stepScreens = {
	language: languageScreen,
	welcome: welcomeScreen,
	rules: rulesScreen,
	game: gameScreen
};
const stepFocusTargets = {
	language: languageOptions[0],
	welcome: nameInput,
	rules: startGameButton,
	game: questionText
};
const wizardSession = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const showStep = (step, restoreFocus = false) => {
	Object.entries(stepScreens).forEach(([name, screen]) => {
		screen.classList.toggle("is-hidden", name !== step);
	});
	if (restoreFocus) stepFocusTargets[step]?.focus({ preventScroll: true });
};

const goToStep = (step) => {
	if (!stepScreens[step]) return;
	showStep(step);
	try {
		window.history.pushState({ wizardSession, wizardStep: step }, "", window.location.href);
	} catch (error) {
		console.warn("This browser could not save the current game step.", error);
	}
};

try {
	window.history.pushState({ wizardSession, wizardStep: "language" }, "", window.location.href);
} catch (error) {
	console.warn("This browser could not initialize game step history.", error);
}

window.addEventListener("popstate", (event) => {
	if (event.state?.wizardSession !== wizardSession) {
		if (event.state?.wizardSession) window.history.back();
		return;
	}
	if (stepScreens[event.state.wizardStep]) showStep(event.state.wizardStep, true);
});

let questionBank = [];
let topicPills = [];
let gameState = DataSpaceState.reset();
let currentQuestion;
let wrongAnswers = new Set();
const destinationColors = ["blue", "pink", "yellow", "orange", "cyan"];
const taskTitles = {
	it_role: "Collaborate Across the IT Cell",
	training: "Plan and Deliver Technical Training",
	mentoring: "Mentor and Guide Students",
	ds_practice: "Support Hands-on Data Science",
	learning_culture: "Build a Data Science Learning Culture",
	external: "Connect with the Data Science Ecosystem"
};

const getQuestionLanguage = () => localStorage.getItem("dataSpaceQuestionLanguage") || "en";

const buildTopicPills = (categories) => {
	topicStrip.replaceChildren();
	topicPills = categories.map((category) => {
		const pill = document.createElement("li");
		const title = document.createElement("span");
		pill.className = "topic-pill";
		pill.dataset.category = category.id;
		title.textContent = taskTitles[category.id] || category.name?.en || category.id;
		pill.append(title);
		topicStrip.append(pill);
		return pill;
	});
};

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
	answerOptions.replaceChildren();
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
		answerOptions.append(button);
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
	answerFeedback.textContent = "Correct! Moving to the next task…";
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
		const response = await fetch("data/it-question.json");
		if (!response.ok) throw new Error(`Question bank request failed: ${response.status}`);
		const data = await response.json();
		if (!Array.isArray(data.categories) || data.categories.length !== 6 || data.categories.some((category) => !category.id || !Array.isArray(category.questions) || category.questions.length === 0)) {
			throw new Error("Question bank has an unexpected topic structure.");
		}
		buildTopicPills(data.categories);
		questionBank = data.categories.map((category) => ({
			category,
			...category.questions[Math.floor(Math.random() * category.questions.length)]
		}));
		const language = getQuestionLanguage();
		if (questionBank.some((question) => !question.question?.[language] || question.options?.[language]?.length !== 5 || !Number.isInteger(question.correct) || question.correct < 0 || question.correct >= question.options[language].length)) {
			throw new Error("Question bank has missing translated content or an invalid answer.");
		}
		showQuestion();
	} catch (error) {
		console.error(error);
		questionNumber.textContent = "!";
		questionText.textContent = "The IT Cell mission could not be loaded. Please refresh and try again.";
	}
};

languageOptions.forEach((option) => {
	option.addEventListener("click", () => {
		const selectedLanguage = option.dataset.language;
		localStorage.setItem("dataSpaceQuestionLanguage", selectedLanguage);
		languageOptions.forEach((item) => item.classList.remove("is-selected"));
		option.classList.add("is-selected");
		goToStep("welcome");
		nameInput.focus();
	});
});

nameForm.addEventListener("submit", (event) => {
	event.preventDefault();
	const name = nameInput.value.trim();
	if (!name) return;
	crewName.textContent = name;
	goToStep("rules");
	startGameButton.focus();
});

startGameButton.addEventListener("click", () => {
	gameState = DataSpaceState.reset();
	goToStep("game");
	questionText.focus({ preventScroll: true });
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
