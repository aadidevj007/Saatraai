from datetime import datetime, timezone
import unittest

from app.db.session import SessionLocal
from app.models import (
    Conclusion,
    Evidence,
    EvidencePolarity,
    Hypothesis,
    ImageMetadata,
    ImageModality,
    ImageRelationship,
    ImageRelationshipType,
    Investigation,
    ModelRun,
    Project,
    Query,
    Report,
    Task,
    UploadedImage,
    User,
)
from app.services.security import hash_password


class RelationalModelTests(unittest.TestCase):
    def test_investigation_graph_persists(self) -> None:
        session = SessionLocal()
        transaction = session.begin()
        try:
            user = User(
                email="model-test@example.com",
                display_name="Model Test",
                password_hash=hash_password("model-test-password"),
            )
            project = Project(owner=user, name="Flood monitoring")
            investigation = Investigation(project=project, title="River corridor change")
            query = Query(investigation=investigation, text="What changed?", sequence=1)
            first_image = UploadedImage(project=project, investigation=investigation, original_filename="before.tif")
            second_image = UploadedImage(project=project, investigation=investigation, original_filename="after.tif")
            ImageMetadata(
                image=first_image,
                modality=ImageModality.OPTICAL,
                acquisition_at=datetime.now(timezone.utc),
                crs="EPSG:4326",
                bounding_box={"west": 0, "south": 0, "east": 1, "north": 1},
                width=1024,
                height=1024,
                band_information={"bands": ["red", "green", "blue"]},
                file_format="GeoTIFF",
                mime_type="image/tiff",
                checksum="abc123",
                storage_location="s3://saatraai-test/before.tif",
            )
            ImageRelationship(
                source_image=first_image,
                related_image=second_image,
                relationship_type=ImageRelationshipType.BI_TEMPORAL,
            )
            task = Task(investigation=investigation, task_type="change_detection")
            model_run = ModelRun(
                task=task,
                model_name="change-detector",
                model_version="1.0.0",
                tool_name="test-runner",
                parameters={"threshold": 0.5},
                input_ids=[str(first_image.id), str(second_image.id)],
                output_metadata={"change_pixels": 42},
            )
            hypothesis = Hypothesis(
                investigation=investigation,
                statement="The river corridor changed.",
                confidence=0.8,
            )
            conclusion = Conclusion(
                investigation=investigation,
                hypothesis=hypothesis,
                summary="Observed change supports the hypothesis.",
                confidence=0.8,
            )
            report = Report(
                investigation=investigation,
                conclusion=conclusion,
                title="River corridor investigation report",
            )
            evidence = Evidence(
                investigation=investigation,
                hypothesis=hypothesis,
                image=second_image,
                query=query,
                model_run=model_run,
                polarity=EvidencePolarity.SUPPORTING,
                summary="Detected change area overlaps the corridor.",
                provenance={"method": "change-detector", "run": "test"},
            )
            session.add_all([user, evidence])
            session.flush()
            model_run.input_ids = [str(first_image.id), str(second_image.id)]
            session.flush()

            self.assertEqual(investigation.project.owner, user)
            self.assertEqual(len(investigation.uploaded_images), 2)
            self.assertEqual(first_image.metadata_record.modality, ImageModality.OPTICAL)
            self.assertEqual(len(first_image.source_relationships), 1)
            self.assertEqual(model_run.task, task)
            self.assertEqual(model_run.input_ids, [str(first_image.id), str(second_image.id)])
            self.assertEqual(evidence.hypothesis, hypothesis)
            self.assertEqual(evidence.provenance["method"], "change-detector")
            self.assertEqual(report.conclusion, conclusion)
        finally:
            transaction.rollback()
            session.close()
