import unittest

from geoalchemy2 import WKTElement
from sqlalchemy import inspect, text

from app.db.session import SessionLocal, engine
from app.models import ImageMetadata, ImageModality, Investigation, Project, UploadedImage, User
from app.services.security import hash_password


class GeospatialModelTests(unittest.TestCase):
    def test_spatial_columns_and_postgis_operations(self) -> None:
        columns = {column["name"] for column in inspect(engine).get_columns("image_metadata")}
        self.assertTrue(
            {"footprint_geometry", "bounding_geometry", "centroid_geometry"}.issubset(columns)
        )

        session = SessionLocal()
        transaction = session.begin()
        try:
            user = User(
                email="geospatial-test@example.com",
                password_hash=hash_password("geospatial-test-password"),
            )
            project = Project(owner=user, name="Spatial test")
            investigation = Investigation(project=project, title="Spatial validation")
            image = UploadedImage(
                project=project,
                investigation=investigation,
                original_filename="spatial-test.tif",
            )
            metadata = ImageMetadata(
                image=image,
                modality=ImageModality.OPTICAL,
                crs="EPSG:3857",
                bounding_box={"xmin": 0, "ymin": 0, "xmax": 1, "ymax": 1},
                footprint_geometry=WKTElement(
                    "POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))", srid=4326
                ),
                bounding_geometry=WKTElement(
                    "POLYGON((0 0, 1 0, 1 1, 0 1, 0 0))", srid=4326
                ),
                centroid_geometry=WKTElement("POINT(0.5 0.5)", srid=4326),
                storage_location="s3://saatraai-test/spatial-test.tif",
            )
            session.add(user)
            session.flush()

            area, distance, intersects, contains = session.execute(
                text(
                    """
                    SELECT
                        ST_Area(footprint_geometry::geography),
                        ST_Distance(
                            centroid_geometry::geography,
                            ST_SetSRID(ST_MakePoint(0, 0), 4326)::geography
                        ),
                        ST_Intersects(
                            footprint_geometry,
                            ST_GeomFromText('POLYGON((0.25 0.25, 0.75 0.25, 0.75 0.75, 0.25 0.75, 0.25 0.25))', 4326)
                        ),
                        ST_Contains(
                            footprint_geometry,
                            ST_SetSRID(ST_MakePoint(0.5, 0.5), 4326)
                        )
                    FROM image_metadata
                    WHERE id = :metadata_id
                    """
                ),
                {"metadata_id": metadata.id},
            ).one()

            self.assertGreater(area, 0)
            self.assertGreater(distance, 0)
            self.assertTrue(intersects)
            self.assertTrue(contains)
        finally:
            transaction.rollback()
            session.close()
