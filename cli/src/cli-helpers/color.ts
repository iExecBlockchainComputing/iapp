import chalk from 'chalk';

/**
 * use to color helper text in prompts
 */
export const promptHelper = chalk.dim; // grey collides with default value color
/**
 * use to color command comments
 */
export const comment = chalk.dim;
/**
 * use to color command lines
 */
export const command = chalk.yellowBright;
/**
 * use to color with emphasis
 */
export const emphasis = chalk.green;
/**
 * use to color file name
 */
export const file = chalk.cyan;
/**
 * use to color web links
 */
export const link = chalk.blue.underline;
/**
 * use to color errors
 */
export const error = chalk.red;
/**
 * use to color success messages
 */
export const success = chalk.greenBright;
/**
 * use to color worker logs
 */
export const worker = chalk.bold.blue;
