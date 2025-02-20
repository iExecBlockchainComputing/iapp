import boxen from 'boxen';

export function hintBox(message: string) {
  return boxen(message, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'cyan',
  });
}

export function objectBox(message: string) {
  return boxen(message, { margin: 1 });
}
