Experiments with HTMX
java -jar ./schemaspy.jar -vizjs -t pgsql11 -dp ./postgre-jdbc.jar -db dvdrental -host localhost -port 5432 -s public -u postgres -p admin -o output
https://github.com/schemaspy/schemaspy

import psycopg2
import csv
import json

# Load database connection parameters from JSON file
with open('db_config.json', 'r') as f:
    conn_params = json.load(f)

def execute_query(query, filename):
    """Executes the given query and writes the results to a CSV file."""
    with psycopg2.connect(**conn_params) as conn:
        with conn.cursor() as cur:
            cur.execute(query)
            rows = cur.fetchall()
            with open(filename, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow([desc[0] for desc in cur.description])  # write headers
                writer.writerows(rows)

# Get the list of schemas
schema_query = """
    SELECT schema_name
    FROM information_schema.schemata
    WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast');
"""

schemas = []
with psycopg2.connect(**conn_params) as conn:
    with conn.cursor() as cur:
        cur.execute(schema_query)
        schemas = [row[0] for row in cur.fetchall()]

# Define schema-specific queries
def get_queries(schema):
    return {
        'tables': f"""
            SELECT table_schema, table_name
            FROM information_schema.tables
            WHERE table_type = 'BASE TABLE'
              AND table_schema = '{schema}'
            ORDER BY table_schema, table_name;
        """,
        'columns': f"""
            SELECT table_schema, table_name, column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_schema = '{schema}'
            ORDER BY table_schema, table_name, ordinal_position;
        """,
        'primary_keys': f"""
            SELECT 
                kcu.table_schema,
                kcu.table_name,
                tco.constraint_name,
                kcu.column_name
            FROM information_schema.table_constraints tco
            JOIN information_schema.key_column_usage kcu 
                ON kcu.constraint_name = tco.constraint_name
                AND kcu.constraint_schema = tco.constraint_schema
            WHERE tco.constraint_type = 'PRIMARY KEY'
              AND kcu.table_schema = '{schema}'
            ORDER BY kcu.table_schema, kcu.table_name, kcu.ordinal_position;
        """,
        'foreign_keys': f"""
            SELECT
                tc.table_schema, 
                tc.table_name, 
                kcu.column_name, 
                ccu.table_schema AS foreign_table_schema,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
            WHERE constraint_type = 'FOREIGN KEY'
              AND tc.table_schema = '{schema}'
            ORDER BY tc.table_schema, tc.table_name;
        """,
        'stored_procedures': f"""
            SELECT 
                n.nspname as "Schema",
                p.proname as "Procedure",
                pg_catalog.pg_get_function_result(p.oid) as "Return Type",
                pg_catalog.pg_get_function_arguments(p.oid) as "Arguments"
            FROM pg_catalog.pg_proc p
                 LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
            WHERE pg_catalog.pg_function_is_visible(p.oid)
                  AND n.nspname = '{schema}'
            ORDER BY 1, 2;
        """,
        'triggers': f"""
            SELECT 
                event_object_schema AS "Schema",
                event_object_table AS "Table",
                trigger_name AS "Trigger",
                action_timing AS "Timing",
                event_manipulation AS "Event",
                action_condition AS "Condition",
                action_statement AS "Statement"
            FROM information_schema.triggers
            WHERE event_object_schema = '{schema}'
            ORDER BY event_object_schema, event_object_table, trigger_name;
        """,
        'sequences': f"""
            SELECT
                sequence_schema AS "Schema",
                sequence_name AS "Sequence",
                data_type AS "Data Type",
                start_value AS "Start Value",
                minimum_value AS "Minimum Value",
                maximum_value AS "Maximum Value",
                increment AS "Increment By",
                cycle_option AS "Is Cyclic"
            FROM
                information_schema.sequences
            WHERE sequence_schema = '{schema}'
            ORDER BY
                sequence_schema,
                sequence_name;
        """,
        'views':  f"""
            SELECT
                table_schema AS "Schema",
                table_name AS "View",
                view_definition AS "Definition"
            FROM
                information_schema.views
            WHERE table_schema = '{schema}'
            ORDER BY
                table_schema,
                table_name;
        """,
        'types': f"""
            SELECT
                n.nspname AS "Schema",
                t.typname AS "Type Name",
                CASE
                    WHEN t.typtype = 'c' THEN 'Composite'
                    WHEN t.typtype = 'e' THEN 'Enum'
                    WHEN t.typtype = 'p' THEN 'Pseudo'
                    WHEN t.typtype = 'd' THEN 'Domain'
                    ELSE 'Other'
                END AS "Type Category",
                t.typlen AS "Length",
                t.typbyval AS "By Value",
                t.typtypmod AS "Type Modifier",
                t.typdefault AS "Default Value"
            FROM
                pg_type t
                JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
            WHERE
                nspname = '{schema}' AND
                t.typtype IN ('c', 'e', 'd')  -- Filters to include only composite types, enums, and domains
            ORDER BY
                n.nspname,
                t.typname;
        """ 

    }

# Execute queries for each schema and save results to CSV files
for schema in schemas:
    queries = get_queries(schema)
    for key, query in queries.items():
        print(schema, key)
        execute_query(query, f'{schema}_{key}.csv')

print("Data extraction complete. CSV files have been generated.")




{
    "dbname": "dvdrental",
    "user": "postgres",
    "password": "admin",
    "host": "localhost",
    "port": "5432"
}
