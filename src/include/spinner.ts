const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

let spinnerTimer: NodeJS.Timeout | undefined;
let spinnerIndex = 0;

function startSpinner(message: string) {
  spinnerIndex = 0;
  process.stdout.write(`${frames[0]} ${message}`);
  spinnerTimer = setInterval(() => {
    spinnerIndex = (spinnerIndex + 1) % frames.length;
    process.stdout.write(`\r${frames[spinnerIndex]} ${message}`);
  }, 80);
}

function updateSpinner(message: string) {
  process.stdout.write(`\r\x1b[K${frames[spinnerIndex]} ${message}`);
}

function stopSpinner(message: string) {
  if (spinnerTimer) {
    clearInterval(spinnerTimer);
    spinnerTimer = undefined;
  }

  process.stdout.write(`\r\x1b[K ${message}\n`);
}

const spinner = {
  start: startSpinner,
  stop: stopSpinner,
  update: updateSpinner,
};

export default spinner;
