#!/bin/bash
# 在本地拉取构建 CloudBeaver 所需的依赖仓库（dbeaver、dbeaver-common、dbeaver-jdbc-libsql）
# 并可选地对 dbeaver 打达梦驱动补丁。
# 应在 cloudbeaver 仓库的上一级目录执行，使 dbeaver 与 cloudbeaver 同级。
set -Eeo pipefail

# 分支/标签，与 server/pom.xml 使用的 DBeaver 版本对应
DBEAVER_BRANCH="${DBEAVER_BRANCH:-release_25_2_1}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# deploy/scripts -> deploy -> cloudbeaver；再上一级 = 与 cloudbeaver 同级的目录
CLOUDBEAVER_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PARENT_DIR="$(dirname "$CLOUDBEAVER_ROOT")"
cd "$PARENT_DIR"

echo "Clone/build deps under: $PARENT_DIR"
echo "DBeaver branch: $DBEAVER_BRANCH"

[ ! -d dbeaver ] && git clone --depth 1 -b "$DBEAVER_BRANCH" https://github.com/dbeaver/dbeaver.git
[ ! -d dbeaver-common ] && git clone --depth 1 -b "$DBEAVER_BRANCH" https://github.com/dbeaver/dbeaver-common.git
[ ! -d dbeaver-jdbc-libsql ] && git clone --depth 1 -b "$DBEAVER_BRANCH" https://github.com/dbeaver/dbeaver-jdbc-libsql.git

chmod a+x $SCRIPT_DIR/*sh

# 对 dbeaver 打达梦、GaussDB 驱动补丁及 GaussDB 数据库列表补丁
"$SCRIPT_DIR/patch-dbeaver-dameng.sh" "$(pwd)/dbeaver"
"$SCRIPT_DIR/patch-dbeaver-gaussdb.sh" "$(pwd)/dbeaver"
"$SCRIPT_DIR/patch-dbeaver-gaussdb-catalogs.sh" "$(pwd)/dbeaver"

echo "Clone and patch done. You can run build from cloudbeaver/deploy (e.g. ./build-backend.sh)."
