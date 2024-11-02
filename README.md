# Core of my Discord Bot Modules

## How to run?
1. Install [git-scm](https://git-scm.com)
2. Install [node.js](https://nodejs.org)
3. Open terminal
```
npm i
git clone https://github.com/TheLeerName/db-module-core
```
4. Open created `db-module-core` folder
5. Open terminal in `db-module-core` folder
6. Choose modules which you want to use:
| Name | Link |
|---|---|
| modules/twitch-notifications | https://github.com/TheLeerName/db-module-twitch-notifications |
7. Run this command with each module you want:
```
git submodule update --init <module_name>
```
8. Now compile with command:
```
npx tsc
```
9. Start app with `run.bat` script
10. App will ask about changing parameters in `config.ini`, so do it and go to next step
11. Start bot with `run.bat` script again yeah

## Q/A
| Question | Answer |
|---|---|
| How to remove module? | Remove folder of module in `modules` folder |
| How to add specific module? (for example: `modules/twitch-notifications`) | git submodule update --init modules/twitch-notifications |