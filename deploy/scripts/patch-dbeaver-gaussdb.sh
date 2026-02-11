#!/bin/bash
# 在 DBeaver generic 插件中插入 GaussDB/openGauss ( gaussdb_jdbc ) 驱动定义
# 用法: 传入 dbeaver 根目录，或从 cloudbeaver 仓库根目录的上一级执行
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

if grep -q 'id="gaussdb_jdbc"' "$PLUGIN_XML"; then
    echo "GaussDB driver already present in DBeaver plugin.xml, skip patch."
    exit 0
fi

python3 - "$PLUGIN_XML" << 'PY'
import sys
path = sys.argv[1]
marker = "<!-- CUBRID -->"
driver_block = '''                <driver
                    id="gaussdb_jdbc"
                    label="GaussDB / openGauss"
                    class="org.postgresql.Driver"
                    sampleURL="jdbc:postgresql://{host}[:{port}]/[{database}]"
                    defaultPort="5432"
                    defaultDatabase="postgres"
                    defaultUser="gaussdb"
                    description="华为 GaussDB / openGauss JDBC 驱动"
                    supportedConfigurationTypes="MANUAL,URL"
                    categories="sql">
                    <file type="jar" path="drivers/gaussdb" bundle="drivers.gaussdb"/>
                </driver>

                <!-- CUBRID -->'''

with open(path, "r", encoding="utf-8", errors="replace") as f:
    content = f.read()
if marker not in content:
    sys.exit("Marker <!-- CUBRID --> not found in plugin.xml")
new_content = content.replace(marker, driver_block, 1)
with open(path, "w", encoding="utf-8") as f:
    f.write(new_content)
print("Patched DBeaver plugin.xml: added gaussdb_jdbc driver.")
PY

echo "Done."
