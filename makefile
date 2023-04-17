.PHONY: t newt pre gray newgray

# 放弃本地修改
drop:
	git add .; git stash; git stash drop

# 拉取远程代码
pull:
	git add .; git stash; git pull --rebase; git stash pop

newDev:
	- git branch -D dev-01;
	export branch=`git branch | grep \* | grep -Eo ' .+'` && \
		git checkout main && \
		git pull --rebase && \
		git checkout -b dev-01 && \
		git merge $$branch && \
		git push --set-upstream origin dev-01 --force && \
		git checkout $$branch;

# 合并当前分支到测试分支
dev:
	- git branch -D dev-01;
	git fetch;
	export branch=`git branch | grep \* | grep -Eo ' .+'` && \
		echo "当前分支: $$branch" && \
		git checkout dev-01 && \
		git pull --rebase && \
		echo "merging: \033[0;31morigin/main\033[0m" && \
		git merge origin/main && \
		echo "merging: \033[0;31m$$branch\033[0m" && \
		git merge $$branch && \
		git push && \
		git checkout $$branch;
	@ echo "\n🚧自动发布中";

# 基于main重新创建t%分支
newDev%:
	@# echo $*;
	- git branch -D dev-$*;
	export branch=`git branch | grep \* | grep -Eo ' .+'` && \
		git checkout main && \
		git pull --rebase && \
		git checkout -b dev-$* && \
		git merge $$branch && \
		git push --set-upstream origin dev-$* --force && \
		git checkout $$branch;

# 合并当前分支到测试分支
dev%:
	@# echo $*;
	- git branch -D dev-$*;
	git fetch;
	export branch=`git branch | grep \* | grep -Eo ' .+'` && \
		echo "当前分支: $$branch" && \
		git checkout dev-$* && \
		git pull --rebase && \
		echo "merging: \033[0;31morigin/main\033[0m" && \
		git merge origin/main && \
		echo "merging: \033[0;31m$$branch\033[0m" && \
		git merge $$branch && \
		git push && \
		git checkout $$branch;
	@ echo "\n🚧自动发布中";

# 基于main重新创建t分支
newT:
	- git branch -D test-01;
	export branch=`git branch | grep \* | grep -Eo ' .+'` && \
		git checkout main && \
		git pull --rebase && \
		git checkout -b test-01 && \
		git merge $$branch && \
		git push --set-upstream origin t --force && \
		git checkout $$branch;

# 合并当前分支到测试分支
t:
	- git branch -D test-01;
	git fetch;
	export branch=`git branch | grep \* | grep -Eo ' .+'` && \
		echo "当前分支: $$branch" && \
		git checkout test-01 && \
		git pull --rebase && \
		echo "merging: \033[0;31morigin/main\033[0m" && \
		git merge origin/main && \
		echo "merging: \033[0;31m$$branch\033[0m" && \
		git merge $$branch && \
		git push && \
		git checkout $$branch;
	@ echo "\n🚧自动发布中";

# 基于main重新创建t%分支
newT%:
	@# echo $*;
	- git branch -D test-$*;
	export branch=`git branch | grep \* | grep -Eo ' .+'` && \
		git checkout main && \
		git pull --rebase && \
		git checkout -b test-$* && \
		git merge $$branch && \
		git push --set-upstream origin test-$* --force && \
		git checkout $$branch;

# 合并当前分支到测试分支
t%:
	@# echo $*;
	- git branch -D test-$*;
	git fetch;
	export branch=`git branch | grep \* | grep -Eo ' .+'` && \
		echo "当前分支: $$branch" && \
		git checkout test-$* && \
		git pull --rebase && \
		echo "merging: \033[0;31morigin/main\033[0m" && \
		git merge origin/main && \
		echo "merging: \033[0;31m$$branch\033[0m" && \
		git merge $$branch && \
		git push && \
		git checkout $$branch;
	@ echo "\n🚧自动发布中";

# merge 测试分支
gray:
	- git branch -D gray;
	git fetch;
	export branch=`git branch | grep \* | grep -Eo ' .+'` && \
		echo "当前分支: $$branch" && \
		git checkout gray && \
		git pull --rebase && \
		echo "merging: \033[0;31morigin/main\033[0m" && \
		git merge origin/main && \
		echo "merging: \033[0;31m$$branch\033[0m" && \
		git merge $$branch && \
		git push && \
		git checkout $$branch;
	@ echo "\n🚧自动发布中";

# 新建gray分支
newGray:
	# 忽略分支不存在错误，删除分支
	- git branch -D gray;
	export branch=`git branch | grep \* | grep -Eo ' .+'` && \
		git checkout main && \
		git pull --rebase && \
		git checkout -b gray && \
		git merge $$branch && \
		git push --set-upstream origin gray --force && \
		git checkout $$branch;
	@ echo "\n🚧自动发布中";


pre:
	git checkout main;
	git pull origin main;
	git branch -D prepublish || echo '0';
	git checkout -b prepublish;
	git push origin prepublish --force;
	git checkout main;
	@ echo "\n🚧自动发布中";

reset:
	@echo "------以下为你的commit信息-------"
	@git log main.. --pretty=format:%B | grep -vE '^\s*$$' | cat
	@echo "\n\n------代码已经reset成功，请add commit有意义的提交信息-------"
	@git log main.. --pretty=format:"%P" --reverse | head -1 | xargs git reset --soft; git reset HEAD . > /tmp/webApp.gitreset.log; git status

rebase:
	export branch=`git branch | grep \* | grep -Eo ' .+'` && \
		git checkout main && \
		git pull --rebase && \
		git checkout $$branch && \
		git rebase main;