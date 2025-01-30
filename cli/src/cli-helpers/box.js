import boxen from 'boxen';

export function hintBox(message) {
  return boxen(message, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'cyan',
  });
}

export function objectBox(message) {
  return boxen(message, { margin: 1 });
}
