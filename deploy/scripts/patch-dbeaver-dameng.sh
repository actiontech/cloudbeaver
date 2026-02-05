#!/bin/bash
# 在 DBeaver generic 插件中插入达梦( dameng_jdbc )驱动定义
# 用法: 从 cloudbeaver 仓库根目录的上一级执行；或传入 dbeaver 根目录
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -n "$1" ]; then
    DBEAVER_ROOT="$1"
else
    DBEAVER_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)/../dbeaver"
fi

PLUGIN_XML="${DBEAVER_ROOT}/plugins/org.jkiss.dbeaver.ext.generic/plugin.xml"
if [ ! -f "$PLUGIN_XML" ]; then
    echo "DBeaver plugin.xml not found: $PLUGIN_XML"
    echo "Usage: $0 [dbeaver_root]"
    exit 1
fi

if grep -q 'id="dameng_jdbc"' "$PLUGIN_XML"; then
    echo "Dameng driver already present in DBeaver plugin.xml, skip patch."
    exit 0
fi

python3 - "$PLUGIN_XML" << 'PY'
import sys
path = sys.argv[1]
# 在 <!-- CUBRID --> 前插入达梦驱动（兼容不同缩进）
marker = "<!-- CUBRID -->"
driver_block = '''                <driver
                    id="dameng_jdbc"
                    label="达梦(DM)"
                    class="dm.jdbc.driver.DmDriver"
                    sampleURL="jdbc:dm://{host}[:{port}]/[{database}]"
                    defaultPort="5236"
                    defaultDatabase="SYSDBA"
                    defaultUser="SYSDBA"
                    description="达梦数据库 JDBC 驱动"
                    supportedConfigurationTypes="MANUAL,URL"
                    categories="sql">
                    <file type="jar" path="drivers/dameng" bundle="drivers.dameng"/>
                </driver>

                <!-- CUBRID -->'''

with open(path, "r", encoding="utf-8", errors="replace") as f:
    content = f.read()
if marker not in content:
    sys.exit("Marker <!-- CUBRID --> not found in plugin.xml")
# 只替换第一次出现，保留该行原有前导空白
new_content = content.replace(marker, driver_block, 1)
with open(path, "w", encoding="utf-8") as f:
    f.write(new_content)
print("Patched DBeaver plugin.xml: added dameng_jdbc driver.")
PY

echo "Done."
