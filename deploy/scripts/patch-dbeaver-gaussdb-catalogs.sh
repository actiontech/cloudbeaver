#!/bin/bash
# 让 Generic 驱动下使用 PostgreSQL JDBC 的数据源（如 GaussDB）通过 pg_database 列出所有数据库，
# 而不是仅显示当前连接的数据库。
# 用法: 传入 dbeaver 根目录
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -n "$1" ]; then
    DBEAVER_ROOT="$1"
else
    DBEAVER_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)/../dbeaver"
fi

JAVA_FILE="${DBEAVER_ROOT}/plugins/org.jkiss.dbeaver.ext.generic/src/org/jkiss/dbeaver/ext/generic/model/GenericDataSource.java"
if [ ! -f "$JAVA_FILE" ]; then
    echo "GenericDataSource.java not found: $JAVA_FILE"
    echo "Usage: $0 [dbeaver_root]"
    exit 1
fi

if grep -q 'isPostgreSQLCompatible' "$JAVA_FILE"; then
    echo "GenericDataSource already patched for PostgreSQL/GaussDB catalogs, skip."
    exit 0
fi

python3 - "$JAVA_FILE" << 'PY'
import sys
path = sys.argv[1]
with open(path, "r", encoding="utf-8", errors="replace") as f:
    content = f.read()

# 在 getCatalogsNames 方法开头、 "final List<String> catalogNames = new ArrayList<>();" 之后
# 插入 isPostgreSQLCompatible 方法和 PostgreSQL 分支；并把原 try 保留为 else 分支
old_sig = """    public List<String> getCatalogsNames(
        @NotNull DBRProgressMonitor monitor,
        @NotNull JDBCDatabaseMetaData metaData,
        GenericMetaObject catalogObject,
        @Nullable DBSObjectFilter catalogFilters
    ) throws DBException {
        final List<String> catalogNames = new ArrayList<>();
        try {
            try (JDBCResultSet dbResult = metaData.getCatalogs()) {"""

new_block = """    /**
     * True if this connection uses PostgreSQL JDBC (e.g. PostgreSQL, GaussDB, openGauss).
     * Such drivers report only the current database from getCatalogs(); we use pg_database to list all.
     */
    private boolean isPostgreSQLCompatible() {
        String driverClass = getContainer().getDriver().getDriverClassName();
        if (driverClass != null && driverClass.contains("postgresql")) {
            return true;
        }
        String url = getContainer().getConnectionConfiguration().getUrl();
        return url != null && url.startsWith("jdbc:postgresql:");
    }

    public List<String> getCatalogsNames(
        @NotNull DBRProgressMonitor monitor,
        @NotNull JDBCDatabaseMetaData metaData,
        GenericMetaObject catalogObject,
        @Nullable DBSObjectFilter catalogFilters
    ) throws DBException {
        final List<String> catalogNames = new ArrayList<>();
        // PostgreSQL JDBC getCatalogs() returns only the current database; use pg_database for full list
        if (isPostgreSQLCompatible()) {
            String pgDatabaseSql = "SELECT datname FROM pg_catalog.pg_database WHERE NOT datistemplate AND datallowconn ORDER BY datname";
            try {
                try (JDBCSession session = DBUtils.openMetaSession(monitor, this, "Read database list")) {
                    try (JDBCStatement stmt = session.createStatement()) {
                        try (JDBCResultSet rs = stmt.executeQuery(pgDatabaseSql)) {
                            while (rs.next()) {
                                String name = JDBCUtils.safeGetStringTrimmed(rs, 1);
                                if (CommonUtils.isNotEmpty(name)) {
                                    if (catalogFilters == null || catalogFilters.matches(name)) {
                                        catalogNames.add(name);
                                        monitor.subTask("Extract catalogs - " + name);
                                    } else {
                                        catalogsFiltered = true;
                                    }
                                    if (monitor.isCanceled()) {
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
                if (catalogNames.size() == 1 && omitSingleCatalog) {
                    catalogNames.clear();
                }
                return catalogNames;
            } catch (SQLException e) {
                if (metaModel.isCatalogsOptional()) {
                    log.warn("Can't read database list from pg_database", e);
                    return catalogNames;
                }
                throw new DBException("Error reading database list", e);
            }
        }
        try {
            try (JDBCResultSet dbResult = metaData.getCatalogs()) {"""

if old_sig not in content:
    sys.exit("Could not find getCatalogsNames insertion point in GenericDataSource.java")
content = content.replace(old_sig, new_block, 1)

with open(path, "w", encoding="utf-8") as f:
    f.write(content)
print("Patched GenericDataSource.java: PostgreSQL/GaussDB full database list via pg_database.")
PY

echo "Done."