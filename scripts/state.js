(function () {
	const initialState = {
		score: 20,
		questionIndex: 0,
		completed: [],
		connections: {}
	};

	window.DataSpaceState = {
		load() {
			try {
				const saved = JSON.parse(sessionStorage.getItem("dataSpaceGameState"));
				return saved ? { ...initialState, ...saved, connections: saved.connections || {} } : { ...initialState, completed: [], connections: {} };
			} catch (error) {
				return { ...initialState, completed: [], connections: {} };
			}
		},
		save(state) {
			sessionStorage.setItem("dataSpaceGameState", JSON.stringify(state));
		},
		reset() {
			const state = { ...initialState, completed: [], connections: {} };
			this.save(state);
			return state;
		}
	};
})();