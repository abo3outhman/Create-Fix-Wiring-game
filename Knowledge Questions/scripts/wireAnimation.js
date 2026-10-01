(function () {
	const svgNamespace = "http://www.w3.org/2000/svg";
	const canvas = document.querySelector("#wire-canvas");
	const questionWireEnd = document.querySelector("#question-wire-end");
	const answerColors = ["blue", "pink", "yellow", "orange", "cyan"];
	let connectedAnswerIndex = null;
	let connectionAnimationRunning = false;

	const setQuestionWireColor = (color) => {
		questionWireEnd.classList.remove(...answerColors.map((name) => `wire-color-${name}`));
		questionWireEnd.classList.add(`wire-color-${color}`);
		const icon = questionWireEnd.querySelector(".wire-break-icon");
		icon.classList.remove(...answerColors.map((name) => `wire-color-${name}`));
		icon.classList.add(`wire-color-${color}`);
	};

	const drawQuestionWires = (newQuestion = false, animateConnection = false, onConnectionComplete = null) => {
		const board = document.querySelector(".wiring-board");
		const answers = [...document.querySelectorAll("#answer-options .answer-option")];
		if (!canvas || !board || !questionWireEnd || !answers.length) return;
		if (newQuestion) {
			connectedAnswerIndex = null;
			connectionAnimationRunning = false;
			setQuestionWireColor("cyan");
			questionWireEnd.querySelector(".wire-break-icon").classList.remove("is-connected");
			answers.forEach((answer) => answer.querySelector(".wire-break-icon")?.classList.remove("is-connected"));
		}
		canvas.replaceChildren();
		if (connectedAnswerIndex === null) return;

		const index = connectedAnswerIndex;
		const targetIcon = answers[index]?.querySelector(".wire-break-icon");
		const sourceIcon = questionWireEnd.querySelector(".wire-break-icon");
		if (!targetIcon || !sourceIcon) return;

		const boardRect = board.getBoundingClientRect();
		canvas.setAttribute("viewBox", `0 0 ${boardRect.width} ${boardRect.height}`);
		canvas.setAttribute("preserveAspectRatio", "none");
		const sourceRect = sourceIcon.getBoundingClientRect();
		const targetRect = targetIcon.getBoundingClientRect();
		const startX = sourceRect.left + sourceRect.width / 2 - boardRect.left;
		const startY = sourceRect.top + sourceRect.height / 2 - boardRect.top;
		const endX = targetRect.left + targetRect.width / 2 - boardRect.left;
		const endY = targetRect.top + targetRect.height / 2 - boardRect.top;
		const isStacked = boardRect.width <= 960;
		const curve = Math.max(24, Math.abs(endY - startY) * .42);
		const controlOne = isStacked ? `${startX + (endX - startX) * .12} ${startY + curve}` : `${startX} ${startY + curve}`;
		const controlTwo = isStacked ? `${endX - 22} ${endY - curve * .35}` : `${endX} ${endY - curve}`;
		const path = document.createElementNS(svgNamespace, "path");
		path.classList.add("branch-wire", `branch-${answerColors[index]}`, "is-connected");
		path.setAttribute("d", `M ${startX} ${startY} C ${controlOne}, ${controlTwo}, ${endX} ${endY}`);
		canvas.append(path);
		const pathLength = path.getTotalLength();
		path.style.setProperty("--wire-length", pathLength);
		path.style.strokeDasharray = `${pathLength}`;
		if (animateConnection) {
			path.style.strokeDashoffset = `${pathLength}`;
			connectionAnimationRunning = true;
			path.addEventListener("animationend", () => {
				path.style.strokeDashoffset = "0";
				path.classList.add("is-settled");
				questionWireEnd.querySelector(".wire-break-icon").classList.add("is-connected");
				targetIcon.classList.add("is-connected");
				connectionAnimationRunning = false;
				onConnectionComplete?.();
			}, { once: true });
		} else {
			path.style.strokeDashoffset = "0";
			path.classList.add("is-settled");
		}
	};

	window.drawQuestionWires = drawQuestionWires;
	window.setQuestionWireState = (answerIndex, state) => {
		if (state !== "connected" || !Number.isInteger(answerIndex) || answerIndex < 0 || answerIndex >= answerColors.length || connectedAnswerIndex !== null) return Promise.resolve();
		connectedAnswerIndex = answerIndex;
		setQuestionWireColor(answerColors[answerIndex]);
		return new Promise((resolve) => {
			let completed = false;
			const finish = () => {
				if (completed) return;
				completed = true;
				resolve();
			};
			drawQuestionWires(false, true, finish);
			window.setTimeout(finish, 1200);
		});
	};

	const observer = new ResizeObserver(() => {
		if (!connectionAnimationRunning) drawQuestionWires();
	});
	const board = document.querySelector(".wiring-board");
	if (board) observer.observe(board);
})();
