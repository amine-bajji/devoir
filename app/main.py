from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict
import spacy
from textblob import TextBlob
from SPARQLWrapper import SPARQLWrapper, JSON
import networkx as nx
import requests
from rdflib import Graph, Namespace, URIRef
from rdflib.namespace import RDF, RDFS, OWL
from rdflib.term import Literal
import urllib3
import ssl
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Create an unverified SSL context
ssl._create_default_https_context = ssl._create_unverified_context

app = FastAPI(
    title="Web Sémantique et NLP API",
    description="API pour l'analyse sémantique et le traitement du langage naturel",
    version="1.0.0"
)

# Configuration CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modèles de données
class TextInput(BaseModel):
    text: str

class Entity(BaseModel):
    text: str
    label: str
    wikidata_id: Optional[str]
    description: Optional[str]

class SemanticAnalysis(BaseModel):
    entities: List[Entity]
    keywords: List[str]
    sentiment: float
    relations: List[Dict]

# Chargement des modèles
nlp = spacy.load("en_core_web_sm")

# Configuration Wikidata
WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql"
sparql = SPARQLWrapper(WIKIDATA_ENDPOINT)

def get_wikidata_info(entity_name: str) -> Optional[Dict]:
    """Search for information on Wikidata using the API"""
    # Remove "The" and clean up the entity name
    clean_name = entity_name.replace("The ", "").strip()
    
    # First get the Wikidata ID using the search API
    search_url = f"https://www.wikidata.org/w/api.php"
    search_params = {
        "action": "wbsearchentities",
        "format": "json",
        "language": "en",
        "search": clean_name
    }
    
    try:
        response = requests.get(search_url, params=search_params, verify=False)
        data = response.json()
        
        if data.get("search"):
            entity = data["search"][0]
            entity_id = entity["id"]
            
            # Now get the description using SPARQL
            query = """
            SELECT ?description WHERE {
                wd:%s schema:description ?description.
                FILTER(LANG(?description) = "en")
            }
            LIMIT 1
            """ % entity_id
            
            sparql.setQuery(query)
            sparql.setReturnFormat(JSON)
            results = sparql.query().convert()
            
            if results["results"]["bindings"]:
                description = results["results"]["bindings"][0]["description"]["value"]
                print(f"Found Wikidata entry for {clean_name}: {entity_id}")
                return {
                    "id": entity_id,
                    "description": description
                }
        
        print(f"No Wikidata results found for: {clean_name}")
    except Exception as e:
        print(f"Wikidata Error for {clean_name}: {e}")
    return None

def create_knowledge_graph(entities: List[Entity]) -> Graph:
    """Create an RDF knowledge graph from the entities"""
    g = Graph()
    
    # Define namespaces
    ns = Namespace("http://example.org/")
    dbo = Namespace("http://dbpedia.org/ontology/")
    
    for entity in entities:
        subject = URIRef(ns[entity.text.replace(" ", "_")])
        g.add((subject, RDF.type, dbo[entity.label]))
        if entity.description:
            g.add((subject, RDFS.comment, Literal(entity.description)))
            
    return g

@app.post("/analyze", response_model=SemanticAnalysis)
async def analyze_text(input: TextInput):
    """Complete text analysis with semantic enrichment"""
    doc = nlp(input.text)
    
    # Entity analysis with Wikidata enrichment
    entities = []
    for ent in doc.ents:
        wikidata_info = get_wikidata_info(ent.text)
        entities.append(Entity(
            text=ent.text,
            label=ent.label_,
            wikidata_id=wikidata_info["id"] if wikidata_info else None,
            description=wikidata_info["description"] if wikidata_info else None
        ))
    
    # Create knowledge graph
    knowledge_graph = create_knowledge_graph(entities)
    
    # Extraction de mots-clés
    keywords = [token.text for token in doc if not token.is_stop and token.is_alpha]
    
    # Analyse de sentiment
    blob = TextBlob(input.text)
    sentiment = blob.sentiment.polarity
    
    # Création du graphe de relations
    G = nx.Graph()
    relations = []
    for ent1 in doc.ents:
        for ent2 in doc.ents:
            if ent1 != ent2:
                G.add_edge(ent1.text, ent2.text)
                relations.append({
                    "source": ent1.text,
                    "target": ent2.text,
                    "type": "co-occurrence"
                })
    
    return SemanticAnalysis(
        entities=entities,
        keywords=keywords[:10],
        sentiment=sentiment,
        relations=relations
    )

@app.get("/entity/{entity_name}")
async def get_entity_info(entity_name: str):
    """Récupère des informations détaillées sur une entité depuis Wikidata"""
    info = get_wikidata_info(entity_name)
    if info:
        return info
    raise HTTPException(status_code=404, detail="Entité non trouvée") 