import { h, Fragment, effect, o } from "./src";
const React = {
	createElement: h,
	Fragment,
};
const count = o(0);
const inc = () => count(count() + 1);
const dec = () => count(count() - 1);
let color = o("red");
const Counter = () => {
	const square = () => count() * count();
	const cube = () => square() * count();
	effect(() => console.log(count(), square(), cube()));

	return (
		<div>
			<div style={{ color: color }}>A</div>
			{() => (count() % 2 === 0 ? color("red") : color("green"))}
			<div>
				Count: {count} {square} {cube}
			</div>
			<button onclick={inc}>+</button>
			<button onclick={dec}>-</button>
			<button
				ref={(e) => {
					console.log(e);
					e.onclick = () => {
						console.log("hi");
					};
				}}
			>
				Try
			</button>
			<div>
				{() =>
					count() % 2 === 0 ? (
						<Ice />
					) : (
						<>
							Wonder
							<>
								<div>ok</div>
							</>
						</>
					)
				}
			</div>
		</div>
	);
};

const Ice = () => (
	<svg
		version="1.1"
		id="Food_Icons"
		xmlns="http://www.w3.org/2000/svg"
		xmlns:xlink="http://www.w3.org/1999/xlink"
		x="0px"
		y="0px"
		width="56.205px"
		height="85.403px"
		viewBox="0 0 56.205 85.403"
		enable-background="new 0 0 56.205 85.403"
		xml:space="preserve"
	>
		<g id="_x35_">
			<g>
				<path
					fill="#EDEDED"
					d="M20.718,74.737l1.97-0.247c1.023-0.128,1.748-1.062,1.619-2.084L15.29,2.001L9.616,2.713l9.017,70.404
       C18.762,74.141,19.695,74.866,20.718,74.737z"
				/>
				<path
					d="M20.476,76.752c-0.854,0-1.678-0.282-2.364-0.814c-0.815-0.634-1.335-1.547-1.464-2.571L7.632,2.967
       C7.565,2.44,7.71,1.908,8.035,1.488c0.326-0.42,0.805-0.693,1.332-0.759l5.674-0.712c1.093-0.142,2.093,0.637,2.233,1.73
       l9.017,70.405c0.129,1.029-0.149,2.043-0.782,2.858c-0.634,0.815-1.547,1.336-2.573,1.464l-1.969,0.247
       C20.803,76.742,20.639,76.752,20.476,76.752z M11.854,4.448L20.6,72.736l1.705-0.214L13.559,4.234L11.854,4.448z"
				/>
			</g>
			<g>
				<path
					fill="#E9785A"
					d="M5.513,39.143l2.71,36.605c0.28,4.422,3.949,7.866,8.38,7.866h22.995c4.432,0,8.1-3.444,8.38-7.867
       l2.705-36.621c0,0-9.527-4.496-22.585,0.008S5.513,39.143,5.513,39.143z"
				/>
			</g>
			<g>
				<polygon
					fill="#EDEDED"
					points="28.107,24.444 28.107,24.679 4.454,24.679 4.436,24.444 		"
				/>
				<path
					d="M28.107,26.679H4.454c-1.045,0-1.914-0.805-1.994-1.847l-0.018-0.235C2.4,24.042,2.59,23.494,2.969,23.085
       c0.378-0.409,0.91-0.641,1.467-0.641h23.67c1.104,0,2,0.896,2,2v0.235C30.107,25.783,29.211,26.679,28.107,26.679z"
				/>
			</g>
			<g>
				<polygon
					fill="#EDEDED"
					points="51.777,24.444 51.759,24.679 28.107,24.679 28.107,24.444 		"
				/>
				<path
					d="M51.76,26.679H28.107c-1.104,0-2-0.896-2-2v-0.235c0-1.104,0.896-2,2-2h23.671c0.557,0,1.089,0.232,1.467,0.641
       c0.379,0.409,0.569,0.957,0.527,1.512l-0.018,0.235C53.674,25.874,52.805,26.679,51.76,26.679z"
				/>
			</g>
			<g opacity="0.1">
				<path
					fill="#FFFFFF"
					d="M45.442,24.679l-3.779,51.054c-0.28,4.422-3.949,7.866-8.38,7.866H16.587c-4.432,0-8.1-3.444-8.38-7.867
       L4.436,24.679H45.442z"
				/>
			</g>
			<g>
				<path
					d="M39.6,85.403H16.605c-5.37,0-9.842-4.198-10.181-9.558l-3.77-51.033c-0.037-0.501,0.136-0.994,0.478-1.362
       c0.341-0.367,0.82-0.576,1.322-0.576H51.76c0.502,0,0.981,0.209,1.322,0.577c0.341,0.367,0.515,0.861,0.478,1.361L49.78,75.865
       C49.442,81.205,44.97,85.403,39.6,85.403z M6.397,26.484l3.628,49.114c0.22,3.483,3.11,6.195,6.58,6.195H39.6
       c3.47,0,6.359-2.713,6.579-6.176l3.637-49.134H6.397z"
				/>
			</g>
			<g>
				<path
					fill="#EDEDED"
					d="M54.205,20.085v4.593H2v-4.593c0-2.572,2.085-4.656,4.666-4.656h42.883
       C52.12,15.429,54.205,17.513,54.205,20.085z"
				/>
			</g>
			<g>
				<path
					fill="#FCFAFB"
					d="M44.438,20.078v4.593H11.767v-4.593c0-2.572,1.305-4.656,2.92-4.656h26.837
       C43.133,15.422,44.438,17.506,44.438,20.078z"
				/>
			</g>
			<g>
				<path
					d="M0,24.679l0-4.593c0-3.67,2.986-6.657,6.657-6.657H49.54c3.675,0,6.666,2.986,6.666,6.657v4.593c0,1.104-0.896,2-2,2H2
       C0.896,26.679,0,25.783,0,24.679z M52.205,20.085c0-1.465-1.196-2.657-2.666-2.657H6.657C5.192,17.429,4,18.621,4,20.085v2.593
       h48.205V20.085z"
				/>
			</g>
			<g>
				<path
					fill="#DA654A"
					d="M34.582,74.547h0.961c1.944,0,3.519-1.576,3.519-3.519v-0.961c0-1.944-1.576-3.519-3.519-3.519h-0.961
       c-1.944,0-3.519,1.576-3.519,3.519v0.961C31.063,72.971,32.638,74.547,34.582,74.547z"
				/>
			</g>
			<g>
				<path
					fill="#DA654A"
					d="M19.488,62.372h0.961c1.944,0,3.519-1.576,3.519-3.519v-0.961c0-1.944-1.576-3.519-3.519-3.519h-0.961
       c-1.944,0-3.519,1.576-3.519,3.519v0.961C15.969,60.797,17.545,62.372,19.488,62.372z"
				/>
			</g>
			<g>
				<path
					fill="#DA654A"
					d="M36.582,53.122h0.961c1.944,0,3.519-1.576,3.519-3.519v-0.961c0-1.944-1.576-3.519-3.519-3.519h-0.961
       c-1.944,0-3.519,1.576-3.519,3.519v0.961C33.063,51.547,34.638,53.122,36.582,53.122z"
				/>
			</g>
		</g>
	</svg>
);

const App = () => (
	<main>
		<Counter />
	</main>
);

document.body.append(<App />);
