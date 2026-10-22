# PostIt - MERN Project Group 4
## PostIt Frontend

### Initial Setup
In your terminal directory
```
mkdir PostIt
cd ./PostIt
git clone git@github.com:arielfevry/postit-backend.git
git clone 
```
- If you are using WSL, you can then use "code ." to open an IDE like VSCode 
- If not, you can use your editor from your desktop and use git clone in your workspace

### Pushing and Pulling code

When making any changes to the repository files, make sure to check out a branch to your local machine using this command:
```bash
git checkout -b <your-branch-name>
git pull # when making changes, make sure to pull often to remain up-to-date
```
You can then make your changes, stage them, commit, and push to main. 
```bash
git add <file-name> or . # "git add ." stages all modifications
git commit -m "commit message"
git push
```

###  Commit Framework
- "feat: (explanation of new feature added)"
- "fix: (what the commit is fixing)"
- "style: (formatting, typo changes)"
- "tests: (adding tests and what they are)"

### Accessing the Droplet
Since we're not coding directly on the droplet through repo branches, we can SSH as root (Only When Necessary)
```
ssh root@postit.arielfevry.com
```
No password is needed since you're authenticated with your ssh key
