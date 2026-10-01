const params = new URLSearchParams(window.location.search);
const scoreValue = document.querySelector("#celebration-score");

if (scoreValue) {
	const score = Number(params.get("score") || 20);
	scoreValue.textContent = score;
}
