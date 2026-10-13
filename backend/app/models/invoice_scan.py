"""Store hashes of scanned invoices, not the invoice files themselves."""
from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class InvoiceScan(Base):
    __tablename__ = "invoice_scans"

    id = Column(Integer, primary_key=True, autoincrement=True)
    shop_id = Column(Integer, ForeignKey("shops.id", ondelete="CASCADE"), nullable=False)
    content_sha256 = Column(String(64), nullable=False)
    scanned_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    __table_args__ = (
        Index("ix_invoice_scans_shop_hash", "shop_id", "content_sha256"),
    )
