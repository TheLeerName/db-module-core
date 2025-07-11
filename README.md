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
| `modules/twitch-notifications` | https://github.com/TheLeerName/db-module-twitch-notifications |
7. Run this command with each module you want:
```
git submodule update --init <module_name>
```
8. Now compile with command:
> [!IMPORTANT]
> if you removing/adding modules, make sure to remove `dist` folder before doing this
```
npm run build
```
9. Open terminal
10. Run `node index.js`
10. Change parameters in generated `config.ini`
11. Start bot again with `node index.js`

## Q/A
| Question | Answer |
|---|---|
| How to remove module? | Remove folder of module in `modules` folder |
| How to add specific module? (for example: `modules/twitch-notifications`) | Run command: `git submodule update --init modules/twitch-notifications` |
> [!IMPORTANT]
> make sure to remove `dist` folder after adding/removing modules
