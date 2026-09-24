(function () {
	const positionWire = function (categoryId, answerIndex) {
		const line = document.querySelector(`.wire-line[data-category="${categoryId}"]`);
		const sourceSymbol = document.querySelector(`.left-wires .wire-node[data-category="${categoryId}"]`);
		const target = document.querySelector(`#answer-options .answer-option:nth-child(${Number(answerIndex) + 1})`);
		const board = document.querySelector(".wiring-board");
		if (!line || !sourceSymbol || !target || !board) return;
		const boardRect = board.getBoundingClientRect();
		const sourceRect = sourceSymbol.getBoundingClientRect();
		const targetRect = target.getBoundingClientRect();
		const startX = sourceRect.left + sourceRect.width / 2 - boardRect.left;
		const startY = sourceRect.top + sourceRect.height / 2 - boardRect.top;
		const endX = targetRect.left + targetRect.width / 2 - boardRect.left;
		const endY = targetRect.top + targetRect.height / 2 - boardRect.top;
		const length = Math.hypot(endX - startX, endY - startY);
		const angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;
		line.dataset.answerIndex = answerIndex;
		line.style.left = `${startX}px`;
		line.style.right = "auto";
		line.style.top = `${startY}px`;
		line.style.width = `${length}px`;
		line.style.transform = `rotate(${angle}deg)`;
		line.classList.add("wire-connected");
	};

	window.connectWire = function (categoryId, answerIndex) {
		const source = document.querySelector(`.left-wires .wire-node[data-category="${categoryId}"]`);
		if (source) source.classList.add("is-solved");
		positionWire(categoryId, answerIndex);
	};

	window.addEventListener("resize", () => {
		document.querySelectorAll(".wire-line[data-answer-index]").forEach((line) => {
			positionWire(line.dataset.category, line.dataset.answerIndex);
		});
	});
})();