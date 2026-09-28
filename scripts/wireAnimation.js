(function () {
	const svgNamespace = "http://www.w3.org/2000/svg";
	const canvas = document.querySelector("#wire-canvas");
	const connectedAnswers = new Set();
	let connectionAnimationRunning = false;

	const drawQuestionWires = function (newQuestion = false) {
		const board = document.querySelector(".wiring-board");
		const question = document.querySelector("#question-card");
		const answers = [...document.querySelectorAll("#answer-options .answer-option")];
		if (!canvas || !board || !question || !answers.length) return;
		if (newQuestion) {
			connectedAnswers.clear();
			connectionAnimationRunning = false;
		}
		canvas.replaceChildren();
		const boardRect = board.getBoundingClientRect();
		canvas.setAttribute("viewBox", `0 0 ${boardRect.width} ${boardRect.height}`);
		canvas.setAttribute("preserveAspectRatio", "none");
		const questionRect = question.getBoundingClientRect();
		const startX = questionRect.left + questionRect.width / 2 - boardRect.left;
		const startY = questionRect.bottom - boardRect.top;
		const isStacked = boardRect.width <= 960;

		answers.forEach((answer, index) => {
			const answerRect = answer.getBoundingClientRect();
			const endX = isStacked
				? answerRect.left - boardRect.left - 9
				: answerRect.left + answerRect.width / 2 - boardRect.left;
			const endY = isStacked
				? answerRect.top + answerRect.height / 2 - boardRect.top
				: answerRect.top - boardRect.top - 2;
			const curve = Math.max(24, Math.abs(endY - startY) * .42);
			const fan = (index - (answers.length - 1) / 2) * Math.min(16, boardRect.width * .045);
			const path = document.createElementNS(svgNamespace, "path");
			path.classList.add("branch-wire", `branch-${["blue", "pink", "yellow", "orange", "cyan"][index]}`);
			path.dataset.answerIndex = index;
			const controlOne = isStacked ? `${startX + fan} ${startY + curve}` : `${startX} ${startY + curve}`;
			const controlTwo = isStacked ? `${endX - 18} ${endY - curve * .35}` : `${endX} ${endY - curve}`;
			path.setAttribute("d", `M ${startX} ${startY} C ${controlOne}, ${controlTwo}, ${endX} ${endY}`);
			canvas.append(path);
			const pathLength = path.getTotalLength();
			path.dataset.pathLength = pathLength;
			path.style.setProperty("--wire-length", pathLength);
			path.style.strokeDasharray = `${pathLength}`;
			if (connectedAnswers.has(index)) {
				path.classList.add("is-connected");
				path.classList.add("is-settled");
				path.style.strokeDashoffset = "0";
			} else {
				path.style.strokeDashoffset = `${pathLength}`;
			}
		});
	};

	window.drawQuestionWires = drawQuestionWires;
	window.setQuestionWireState = function (answerIndex, state) {
		const branch = canvas?.querySelector(`.branch-wire[data-answer-index="${answerIndex}"]`);
		if (state !== "connected" || !branch || connectedAnswers.has(Number(answerIndex))) return;
		connectedAnswers.add(Number(answerIndex));
		connectionAnimationRunning = true;
		branch.classList.add("is-connected");
		branch.addEventListener("animationend", () => {
			branch.style.strokeDashoffset = "0";
			branch.classList.add("is-settled");
			connectionAnimationRunning = false;
		}, { once: true });
	};

	const observer = new ResizeObserver(() => {
		if (!connectionAnimationRunning) drawQuestionWires();
	});
	const board = document.querySelector(".wiring-board");
	if (board) observer.observe(board);
})();