const crew = document.querySelector("#ejected-crew");
const knowledgeMissionUrl = "Knowledge%20Questions/index.html";
let missionOpened = false;

const openKnowledgeMission = () => {
	if (missionOpened) return;
	missionOpened = true;
	window.location.replace(knowledgeMissionUrl);
};

if (crew) {
	crew.addEventListener("animationend", (event) => {
		if (event.animationName === "crew-ejection") openKnowledgeMission();
	}, { once: true });
	window.setTimeout(openKnowledgeMission, 5500);
} else {
	openKnowledgeMission();
}
