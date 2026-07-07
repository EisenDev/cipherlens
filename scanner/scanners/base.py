import abc
from models import ScanResult

class BaseScanner(abc.ABC):
    """
    Abstract base class for all scanner modules in CipherLens.
    """

    @abc.abstractmethod
    def scan(self, target: str) -> ScanResult:
        """
        Executes the security scan against the given target.
        
        :param target: Target identifier (e.g. website URL or local path to cloned repository)
        :return: A structured ScanResult Pydantic model
        """
        pass
