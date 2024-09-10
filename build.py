import os
import json
import subprocess
import sqlite3
from packaging.version import Version

# Directories
TEMP_DIR = "temp_repos"
DATA_DIR = "data"
CATALOGS_FILE = os.path.join(DATA_DIR, "catalogs.json")

# Create necessary directories if they don't exist
os.makedirs(DATA_DIR, exist_ok=True)

# Clear previous catalog metadata
catalogs = []

# Function to clone or update a Git repository
def clone_or_pull_repo(repo_url, repo_path):
    if os.path.isdir(repo_path):
        print(f"Pulling latest changes for {repo_path}...")
        subprocess.run(["git", "-C", repo_path, "pull"], check=True)
    else:
        print(f"Cloning repository: {repo_url}...")
        subprocess.run(["git", "clone", repo_url, repo_path], check=True)

# Function to fetch related data for a solution
def fetch_related_data(cursor, solution_id):
    # Fetch authors
    cursor.execute("""
        SELECT author.name 
        FROM solution_author 
        JOIN author ON solution_author.author_id = author.author_id
        WHERE solution_author.solution_id = ?
    """, (solution_id,))
    authors = [row[0] for row in cursor.fetchall()]

    # Fetch arguments
    cursor.execute("""
        SELECT argument.name, argument.type, argument.description, argument.default_value, argument.required
        FROM solution_argument
        JOIN argument ON solution_argument.argument_id = argument.argument_id
        WHERE solution_argument.solution_id = ?
    """, (solution_id,))
    arguments = [{"name": row[0], "type": row[1], "description": row[2], "default_value": row[3], "required": bool(row[4])} for row in cursor.fetchall()]

    # Fetch citations
    cursor.execute("""
        SELECT citation.text, citation.doi, citation.url
        FROM solution_citation
        JOIN citation ON solution_citation.citation_id = citation.citation_id
        WHERE solution_citation.solution_id = ?
    """, (solution_id,))
    citations = [{"text": row[0], "doi": row[1], "url": row[2]} for row in cursor.fetchall()]

    # Fetch documentation
    cursor.execute("""
        SELECT documentation.documentation 
        FROM documentation 
        WHERE documentation.solution_id = ?
    """, (solution_id,))
    documentation = [row[0] for row in cursor.fetchall()]

    # Fetch tags
    cursor.execute("""
        SELECT tag.name 
        FROM solution_tag
        JOIN tag ON solution_tag.tag_id = tag.tag_id
        WHERE solution_tag.solution_id = ?
    """, (solution_id,))
    tags = [row[0] for row in cursor.fetchall()]

    return {
        "authors": authors,
        "arguments": arguments,
        "citations": citations,
        "documentation": documentation,
        "tags": tags
    }

# Function to process a catalog repository
def process_catalog(repo_url):
    # Extract repository name from URL
    repo_name = os.path.splitext(os.path.basename(repo_url))[0]
    repo_path = os.path.join(TEMP_DIR, repo_name)

    # Clone or pull the repository
    clone_or_pull_repo(repo_url, repo_path)

    # Read the catalog name from album_catalog_index.json
    index_file = os.path.join(repo_path, "album_catalog_index.json")
    if not os.path.isfile(index_file):
        print(f"Error: album_catalog_index.json not found in {repo_name}")
        return

    with open(index_file) as f:
        catalog_data = json.load(f)

    catalog_name = catalog_data.get("name")
    if not catalog_name:
        print(f"Error: Catalog name not found in {index_file}")
        return

    # Process the SQLite database
    db_path = os.path.join(repo_path, "album_catalog_index.db")
    if not os.path.isfile(db_path):
        print(f"Error: SQLite database not found in {repo_name}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check if the solution table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='solution';")
    if not cursor.fetchone():
        print(f"Error: 'solution' table not found in {repo_name}")
        return

    # Export solutions to a JSON file (including new fields)
    cursor.execute("""
        SELECT solution_id, "group", name, title, version, description, doi, license, album_version, album_api_version, changelog, acknowledgement 
        FROM solution
    """)
    solutions = []
    for solution in cursor.fetchall():
        solution_id, group, name, title, version, description, doi, license, album_version, album_api_version, changelog, acknowledgement = solution
        related_data = fetch_related_data(cursor, solution_id)

        solutions.append({
            "group": group,
            "name": name,
            "title": title,
            "version": version,
            "description": description,
            "doi": doi,
            "license": license,
            "album_version": album_version,
            "album_api_version": album_api_version,
            "changelog": changelog,
            "acknowledgement": acknowledgement,
            **related_data
        })

    # Sort solutions by version using SemVer
    solutions.sort(key=lambda s: Version(s["version"]), reverse=True)

    solutions_file = os.path.join(DATA_DIR, f"{catalog_name}.json")
    with open(solutions_file, "w") as f:
        json.dump(solutions, f, indent=2)

    print(f"Solutions for {catalog_name} saved in {solutions_file}")

    # Add the catalog name and URL to the catalog list
    catalogs.append({
        "name": catalog_name,
        "url": repo_url
    })

    # Close the database connection
    conn.close()

# Read the catalog URLs from catalogs.txt
with open("catalogs.txt") as f:
    repo_urls = f.read().splitlines()

# Process each repository
os.makedirs(TEMP_DIR, exist_ok=True)

for repo_url in repo_urls:
    process_catalog(repo_url)

# Write the catalogs.json file (store name and URL for each catalog)
with open(CATALOGS_FILE, "w") as f:
    json.dump(catalogs, f, indent=2)

# Clean up temporary directory
subprocess.run(["rm", "-rf", TEMP_DIR])

print("All catalogs processed successfully.")
