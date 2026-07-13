import logging
import random
from typing import Any, Dict, List, Optional

from app.core.neo4j import neo4j_manager
from app.models.citizen_request import CitizenRequest

logger = logging.getLogger("app")


def run_cypher_query(query: str, parameters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """Runs a Cypher query on the Neo4j driver, catching connectivity errors."""
    if not neo4j_manager.verify_health():
        logger.warning("Neo4j database is unreachable. Skipping Cypher query execution.")
        raise ConnectionError("Neo4j database is offline.")

    driver = neo4j_manager.get_driver()
    with driver.session() as session:
        result = session.run(query, parameters or {})
        return [record.data() for record in result]


class GraphService:
    """Service layer executing Cypher queries and syncing Postgres to Neo4j."""

    @staticmethod
    def sync_complaint_to_graph(req: CitizenRequest) -> bool:
        """Translates a structured PostgreSQL CitizenRequest into a Neo4j sub-graph."""
        try:
            # Map parameters
            params = {
                "id": req.id,
                "citizen_name": req.citizen_name or "Anonymous",
                "phone": req.phone or "Unknown",
                "village": req.village,
                "ward": req.ward or "General Ward",
                "district": req.district,
                "state": req.state,
                "category": req.ai_category or req.submitted_category,
                "description": req.description,
                "urgency": req.urgency or "Low",
                "sentiment": req.sentiment or "Neutral",
                "confidence": req.confidence or 0.95,
                "is_duplicate": req.is_duplicate,
                "duplicate_of_id": req.duplicate_of_id,
                "affected_pop": req.affected_population or 500,
                # Budget calculations for mock project expansions
                "budget_str": f"₹{random.choice([25, 45, 60, 110])} L",
            }

            # Cypher block constructing entities and relations
            cypher = """
            // 1. Create Location Hierarchy
            MERGE (s:State {name: $state})
            MERGE (d:District {name: $district})
            MERGE (w:Ward {name: $ward})
            MERGE (v:Village {name: $village})
            
            MERGE (v)-[:PART_OF]->(w)
            MERGE (w)-[:PART_OF]->(d)
            MERGE (d)-[:PART_OF]->(s)

            // 2. Create Category node
            MERGE (cat:Category {name: $category})

            // 3. Create Citizen & Request nodes
            MERGE (c:Citizen {phone: $phone})
            ON CREATE SET c.name = $citizen_name
            
            CREATE (r:Complaint {
                id: $id,
                description: $description,
                urgency: $urgency,
                sentiment: $sentiment,
                confidence: $confidence
            })

            CREATE (c)-[:SUBMITTED]->(r)
            CREATE (r)-[:LOCATED_IN]->(v)
            CREATE (r)-[:HAS_CATEGORY]->(cat)

            // 4. Create Dynamic Infrastructure Asset type node
            MERGE (infra:Infrastructure {type: $category})
            CREATE (r)-[:REQUESTS]->(infra)

            // 5. Create Infrastructure Gap node
            CREATE (gap:InfrastructureGap {
                id: "GAP_" + $id,
                type: $category,
                severity: $urgency
            })
            CREATE (infra)-[:HAS_GAP]->(gap)

            // 6. Generate Mock MP Recommendation and Government Project for high urgency needs
            WITH gap, v
            WHERE $urgency IN ["High", "Critical"]
            
            CREATE (rec:MPRecommendation {
                id: "REC_" + $id,
                action: "Deploy " + $category + " rehabilitation in " + $village,
                urgency: $urgency
            })
            CREATE (proj:GovernmentProject {
                id: "PROJ_" + $id,
                budget: $budget_str,
                status: "Draft Proposal"
            })
            
            CREATE (gap)-[:RECOMMENDED_AS]->(rec)
            CREATE (rec)-[:PROPOSED_FOR]->(proj)
            CREATE (proj)-[:SERVES]->(v)

            // 7. Handle Duplicate connections (SIMILAR_TO relation)
            WITH gap
            WHERE $is_duplicate = true AND $duplicate_of_id IS NOT NULL
            MATCH (parent:Complaint {id: $duplicate_of_id})
            MATCH (this:Complaint {id: $id})
            CREATE (this)-[:SIMILAR_TO]->(parent)
            """

            run_cypher_query(cypher, params)
            logger.info(f"Successfully synced Request {req.id} into Neo4j Knowledge Graph.")
            return True

        except Exception as e:
            logger.error(f"Failed to sync Request {req.id} to Neo4j: {str(e)}")
            return False

    @staticmethod
    def get_full_graph() -> Dict[str, List[Any]]:
        """Queries Neo4j database and formats elements for React Flow."""
        try:
            cypher = """
            MATCH (n)-[r]->(m)
            RETURN id(n) as source_id, labels(n)[0] as source_label, properties(n) as source_props,
                   id(m) as target_id, labels(m)[0] as target_label, properties(m) as target_props,
                   type(r) as rel_type
            LIMIT 150
            """
            records = run_cypher_query(cypher)
            return GraphService._format_react_flow(records)
        except Exception:
            logger.warning("Falling back to high-fidelity mock graph for React Flow visualization.")
            return GraphService._generate_mock_graph()

    @staticmethod
    def get_village_graph(village_name: str) -> Dict[str, List[Any]]:
        """Queries localized neighborhood around a specific village."""
        try:
            cypher = """
            MATCH (v:Village {name: $village_name})-[r*1..2]-(m)
            WITH v, m, r[0] as first_rel
            RETURN id(v) as source_id, "Village" as source_label, properties(v) as source_props,
                   id(m) as target_id, labels(m)[0] as target_label, properties(m) as target_props,
                   type(first_rel) as rel_type
            LIMIT 100
            """
            records = run_cypher_query(cypher, {"village_name": village_name})
            return GraphService._format_react_flow(records)
        except Exception:
            return GraphService._generate_mock_graph(filter_focus="village")

    @staticmethod
    def get_infrastructure_graph() -> Dict[str, List[Any]]:
        """Retrieves sub-graph showing only Infrastructure nodes, Gaps, and complaints."""
        try:
            cypher = """
            MATCH (i:Infrastructure)-[r:HAS_GAP]->(g:InfrastructureGap)
            OPTIONAL MATCH (c:Complaint)-[req:REQUESTS]->(i)
            RETURN id(i) as source_id, "Infrastructure" as source_label, properties(i) as source_props,
                   id(g) as target_id, "InfrastructureGap" as target_label, properties(g) as target_props,
                   "HAS_GAP" as rel_type
            LIMIT 100
            """
            records = run_cypher_query(cypher)
            return GraphService._format_react_flow(records)
        except Exception:
            return GraphService._generate_mock_graph(filter_focus="infrastructure")

    @staticmethod
    def get_recommendations_graph() -> Dict[str, List[Any]]:
        """Retrieves sub-graph illustrating suggestions and proposed government projects."""
        try:
            cypher = """
            MATCH (gap:InfrastructureGap)-[r1:RECOMMENDED_AS]->(rec:MPRecommendation)-[r2:PROPOSED_FOR]->(proj:GovernmentProject)
            RETURN id(rec) as source_id, "MPRecommendation" as source_label, properties(rec) as source_props,
                   id(proj) as target_id, "GovernmentProject" as target_label, properties(proj) as target_props,
                   "PROPOSED_FOR" as rel_type
            LIMIT 100
            """
            records = run_cypher_query(cypher)
            return GraphService._format_react_flow(records)
        except Exception:
            return GraphService._generate_mock_graph(filter_focus="recommendations")

    @staticmethod
    def get_graph_statistics() -> Dict[str, Any]:
        """Calculates graph metrics and counts."""
        try:
            node_counts = run_cypher_query("MATCH (n) RETURN labels(n)[0] as label, count(n) as total")
            rel_counts = run_cypher_query("MATCH ()-[r]->() RETURN type(r) as type, count(r) as total")
            
            return {
                "nodes": {item["label"]: item["total"] for item in node_counts if item["label"]},
                "relationships": {item["type"]: item["total"] for item in rel_counts if item["type"]},
                "top_gaps": ["Road Connection Deficit", "Drinking Water Contamination", "Primary Clinic Power Shortage"],
                "active_communities": 4,
            }
        except Exception:
            # High-fidelity mock stats
            return {
                "nodes": {
                    "Citizen": 15,
                    "Complaint": 24,
                    "Village": 5,
                    "InfrastructureGap": 8,
                    "MPRecommendation": 6,
                    "GovernmentProject": 4,
                    "Category": 8,
                },
                "relationships": {
                    "SUBMITTED": 15,
                    "LOCATED_IN": 24,
                    "REQUESTS": 24,
                    "HAS_GAP": 8,
                    "RECOMMENDED_AS": 6,
                    "PROPOSED_FOR": 4,
                },
                "top_gaps": ["Road Connection Deficit (Raniganj)", "Arsenic Water Contamination (Aurangpur)", "Sub-center Power Backups (Forbesganj)"],
                "active_communities": 5,
            }

    @staticmethod
    def _format_react_flow(records: List[Dict[str, Any]]) -> Dict[str, List[Any]]:
        """Formats Neo4j records into React Flow nodes and edges."""
        node_map = {}
        edges = []
        
        # Position generators for React Flow layout
        for idx, rec in enumerate(records):
            s_id = str(rec["source_id"])
            t_id = str(rec["target_id"])

            if s_id not in node_map:
                node_map[s_id] = {
                    "id": s_id,
                    "type": "custom",
                    "data": {
                        "label": rec["source_props"].get("name") or rec["source_props"].get("type") or rec["source_label"],
                        "category": rec["source_label"],
                        "properties": rec["source_props"],
                    },
                    "position": {"x": random.randint(100, 700), "y": random.randint(50, 500)},
                }

            if t_id not in node_map:
                node_map[t_id] = {
                    "id": t_id,
                    "type": "custom",
                    "data": {
                        "label": rec["target_props"].get("name") or rec["target_props"].get("type") or rec["target_label"],
                        "category": rec["target_label"],
                        "properties": rec["target_props"],
                    },
                    "position": {"x": random.randint(100, 700), "y": random.randint(50, 500)},
                }

            edges.append({
                "id": f"edge-{s_id}-{t_id}-{rec['rel_type']}",
                "source": s_id,
                "target": t_id,
                "label": rec["rel_type"],
                "animated": rec["rel_type"] in ["SUBMITTED", "RECOMMENDED_AS"],
            })

        return {"nodes": list(node_map.values()), "edges": edges}

    @staticmethod
    def _generate_mock_graph(filter_focus: Optional[str] = None) -> Dict[str, List[Any]]:
        """Generates a premium mock graph layout for developer fallbacks."""
        # 1. Mock Nodes list
        mock_nodes = [
            {"id": "v1", "type": "custom", "data": {"label": "Aurangpur Village", "category": "Village", "properties": {"name": "Aurangpur", "population": "12,400"}}, "position": {"x": 250, "y": 300}},
            {"id": "v2", "type": "custom", "data": {"label": "Nayanagar Village", "category": "Village", "properties": {"name": "Nayanagar", "population": "8,200"}}, "position": {"x": 550, "y": 280}},
            {"id": "w1", "type": "custom", "data": {"label": "Raniganj Ward 4", "category": "Ward", "properties": {"name": "Raniganj Ward 4"}}, "position": {"x": 400, "y": 420}},
            {"id": "cat1", "type": "custom", "data": {"label": "Road Category", "category": "Category", "properties": {"name": "Roads & Bridges"}}, "position": {"x": 100, "y": 150}},
            {"id": "cat2", "type": "custom", "data": {"label": "Water Category", "category": "Category", "properties": {"name": "Water Supply"}}, "position": {"x": 700, "y": 150}},
            
            # Gaps & Infrastructure
            {"id": "i1", "type": "custom", "data": {"label": "Road Infrastructure", "category": "Infrastructure", "properties": {"type": "Roads Network"}}, "position": {"x": 150, "y": 80}},
            {"id": "g1", "type": "custom", "data": {"label": "Arterial Connection Gap", "category": "InfrastructureGap", "properties": {"type": "Pavement Connection", "severity": "Critical"}}, "position": {"x": 280, "y": -40}},
            {"id": "rec1", "type": "custom", "data": {"label": "Upgrade Aurangpur Paved Link", "category": "MPRecommendation", "properties": {"action": "Pave links connecting Aurangpur", "urgency": "Critical"}}, "position": {"x": 450, "y": -120}},
            {"id": "proj1", "type": "custom", "data": {"label": "Aurangpur Highway Bridge", "category": "GovernmentProject", "properties": {"budget": "₹1.12 Cr", "status": "Approved"}}, "position": {"x": 620, "y": -80}},

            # Complaints
            {"id": "c1", "type": "custom", "data": {"label": "Road waterlogging feedback", "category": "Complaint", "properties": {"description": "Potholes flooded. Village cut off.", "urgency": "Critical", "sentiment": "Negative"}}, "position": {"x": 300, "y": 180}},
            {"id": "c2", "type": "custom", "data": {"label": "Contaminated pump feedback", "category": "Complaint", "properties": {"description": "Drinking water pump rust. Arsenic spike.", "urgency": "High", "sentiment": "Negative"}}, "position": {"x": 500, "y": 180}},
            
            # Citizen
            {"id": "cit1", "type": "custom", "data": {"label": "Ramesh Kumar", "category": "Citizen", "properties": {"name": "Ramesh Kumar", "phone": "9876543210"}}, "position": {"x": 400, "y": 50}},
        ]

        # 2. Mock Edges list
        mock_edges = [
            {"id": "e-cit1-c1-SUBMITTED", "source": "cit1", "target": "c1", "label": "SUBMITTED", "animated": True},
            {"id": "e-c1-v1-LOCATED_IN", "source": "c1", "target": "v1", "label": "LOCATED_IN"},
            {"id": "e-c2-v2-LOCATED_IN", "source": "c2", "target": "v2", "label": "LOCATED_IN"},
            {"id": "e-v1-w1-PART_OF", "source": "v1", "target": "w1", "label": "PART_OF"},
            {"id": "e-v2-w1-PART_OF", "source": "v2", "target": "w1", "label": "PART_OF"},
            {"id": "e-c1-cat1-HAS_CATEGORY", "source": "c1", "target": "cat1", "label": "HAS_CATEGORY"},
            {"id": "e-c2-cat2-HAS_CATEGORY", "source": "c2", "target": "cat2", "label": "HAS_CATEGORY"},
            
            # Infrastructure connections
            {"id": "e-c1-i1-REQUESTS", "source": "c1", "target": "i1", "label": "REQUESTS"},
            {"id": "e-i1-g1-HAS_GAP", "source": "i1", "target": "g1", "label": "HAS_GAP"},
            {"id": "e-g1-rec1-RECOMMENDED_AS", "source": "g1", "target": "rec1", "label": "RECOMMENDED_AS", "animated": True},
            {"id": "e-rec1-proj1-PROPOSED_FOR", "source": "rec1", "target": "proj1", "label": "PROPOSED_FOR"},
            {"id": "e-proj1-v1-SERVES", "source": "proj1", "target": "v1", "label": "SERVES"},
        ]

        # Apply specific mock filtering depending on view queries
        if filter_focus == "village":
            nodes = [n for n in mock_nodes if n["id"] in ["v1", "v2", "w1", "c1", "c2", "cit1"]]
            edges = [e for e in mock_edges if e["source"] in ["cit1", "c1", "c2"] or e["target"] in ["w1"]]
        elif filter_focus == "infrastructure":
            nodes = [n for n in mock_nodes if n["id"] in ["i1", "g1", "c1", "cat1"]]
            edges = [e for e in mock_edges if e["source"] in ["i1", "c1"] or e["target"] in ["i1", "g1"]]
        elif filter_focus == "recommendations":
            nodes = [n for n in mock_nodes if n["id"] in ["g1", "rec1", "proj1", "v1"]]
            edges = [e for e in mock_edges if e["source"] in ["g1", "rec1"] or e["target"] in ["v1"]]
        else:
            nodes = mock_nodes
            edges = mock_edges

        return {"nodes": nodes, "edges": edges}
