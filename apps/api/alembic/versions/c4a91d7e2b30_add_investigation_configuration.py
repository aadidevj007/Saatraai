"""add investigation configuration

Revision ID: c4a91d7e2b30
Revises: 2f63ab0f6a5c
Create Date: 2026-10-03 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4a91d7e2b30'
down_revision: Union[str, Sequence[str], None] = '2f63ab0f6a5c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('investigations', sa.Column('configuration', sa.JSON(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('investigations', 'configuration')
